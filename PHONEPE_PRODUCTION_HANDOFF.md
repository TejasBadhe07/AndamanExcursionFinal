# PhonePe Production Payment Failure — Investigation Handoff

**Status:** Root cause identified. Fix is **not** applied — it is an environment-variable
change on the client's Vercel account, plus credentials that must come from the client's
PhonePe merchant dashboard. **Nothing in production has been changed.**

**Branch:** `fix/phonepe-production-env` (do not merge to `main` until step 1 below is done)

---

## TL;DR

The live site is wired to PhonePe's **UAT sandbox**, not production. Customers reach a
test payment simulator and **no real money is ever collected**. One env var causes this.

---

## Symptom

Reported flow: Home → Activities → Scuba Diving → add Shore Dive + Boat Dive →
Proceed for Booking → fill user details → accept T&C → Reserve Booking →
Review page → **Proceed to Payment ₹300** → gateway opens.

What appears:
- Checkout page loads on **`mercury-uat.phonepe.com`** (production is `mercury.phonepe.com`)
- Scanning the UPI QR with a real PhonePe app shows *"You are leaving PhonePe →
  merchant-simulator.phonepe.com"*
- That page is **"Simulate Payment Response — Success / Failure / Submitted"**

There is no crash and no error in the logs. Every line of code executes correctly.
The defect is in *configuration selection*, which is why nothing throws.

---

## Root cause

`PHONEPE_ENV` is not set to exactly `production` in the client's Vercel production
environment.

Two files branch on it:

- `src/services/payments/phonePeOAuthService.ts:22-25` — picks the OAuth host
- `src/services/payments/phonePeServiceV2.ts:24-29` — picks the payment API host

```ts
const isProduction = process.env.PHONEPE_ENV === "production";

this.authUrl = isProduction
  ? "https://api.phonepe.com/apis/identity-manager"
  : "https://api-preprod.phonepe.com/apis/pg-sandbox";   // ← currently here

this.apiUrl = isProduction
  ? "https://api.phonepe.com/apis/pg"
  : "https://api-preprod.phonepe.com/apis/pg-sandbox";   // ← and here
```

It is a **strict** `=== "production"` match with a **silent** fallback. Unset, `"prod"`,
`"Production"`, or a trailing space all quietly select sandbox. `PHONEPE_ENV` is the
**only** switch — setting `PHONEPE_API_URL` does not change the environment.

### Important secondary deduction

OAuth **succeeded** (the checkout page rendered). Production PhonePe credentials do not
authenticate against the sandbox host. Therefore the credentials currently in Vercel
production are the **UAT pair**.

> Setting `PHONEPE_ENV=production` **alone will break payments harder** — it will 401 on
> token generation. The env flag and the production credentials must ship **together**.

### Why this happened

`PRODUCTION_GUIDE.md` used to instruct setting
`PHONEPE_API_URL=https://api.phonepe.com/apis/hermes` — the **v1/hermes** endpoint, left
over from before the v2 migration. It never mentioned `PHONEPE_ENV`. Anyone configuring
Vercel from that guide would reasonably believe they had gone live. **Corrected in this
branch.**

---

## The fix — Vercel → Settings → Environment Variables → **Production** scope

| Variable | Value | Note |
|---|---|---|
| `PHONEPE_ENV` | `production` | **The actual fix.** Exact lowercase string |
| `PHONEPE_MERCHANT_ID` | production **Client ID** | Legacy name; sent as `client_id` |
| `PHONEPE_SALT_KEY` | production **Client Secret** | Legacy name; sent as `client_secret` |
| `PHONEPE_SALT_INDEX` | `1` | |
| `NEXT_PUBLIC_BASE_URL` | `https://<prod-domain>` | **No trailing slash** |
| `PHONEPE_DEV_MODE` | `false` | See security note below |
| `PHONEPE_API_URL` | **DELETE** | v1 leftover, ignored in production mode |

Optional (code defaults are already correct — set only if PhonePe issued different hosts):
`PHONEPE_AUTH_URL=https://api.phonepe.com/apis/identity-manager`,
`PHONEPE_PG_URL=https://api.phonepe.com/apis/pg`

**Env var changes require a redeploy to take effect.**

### Security note — `PHONEPE_DEV_MODE`

`src/services/payments/phonePeServiceV2.ts:365-368`:

```ts
if (this.devMode) {
  console.warn("Callback signature mismatch in dev mode — allowing anyway");
  return true;   // ← accepts a forged callback
}
```

If `PHONEPE_DEV_MODE=true` is set in production, anyone who guesses the callback URL can
POST a fake "payment succeeded" and get a free booking written to MongoDB. **Check whether
this was set.** If it was, treat existing bookings as unverified.

### Trailing-slash note — `NEXT_PUBLIC_BASE_URL`

`src/app/api/payments/phonepe/create-order/route.ts:37` appends `/checkout/payment-return`.
A trailing slash produces `//checkout/...`. If the var is unset it falls back to the
request `host` header — meaning a paying customer could be redirected to a `*.vercel.app`
preview URL after payment.

---

## OPEN QUESTIONS — resolve these first

1. **Has the client completed PhonePe production onboarding / go-live approval?**
   If not, only UAT credentials exist and **no code or env change can fix this** — it is a
   business step with PhonePe. This was unconfirmed at handoff time. **Check this first.**

2. **What is `client_version` in the production dashboard?**
   `src/services/payments/phonePeOAuthService.ts:54` hardcodes `client_version: "1"`.
   UAT is always `1`; production's value is dashboard-specified. If it is anything other
   than `1`, that line needs changing or OAuth will 401 with correct keys.

3. **Was `PHONEPE_DEV_MODE=true` in production?** (see security note)

---

## Changes made in this branch (safe, non-behavioural)

### `src/app/api/payments/phonepe/health/route.ts`
The health endpoint could not detect this failure — it reported `healthy` while running
entirely in sandbox. Now:
- `PHONEPE_ENV` added to the required-vars list
- `PHONEPE_API_URL` **removed** from required (it is sandbox-only; requiring it was backwards)
- New `phonepe_endpoints` check — prints resolved auth/PG hosts, goes `unhealthy` when
  sandbox hosts are detected on a `VERCEL_ENV=production` deploy
- New `callback_signature_enforcement` check — flags `PHONEPE_DEV_MODE=true` in production

### `PRODUCTION_GUIDE.md`
Removed the stale `apis/hermes` (v1) instruction; documented `PHONEPE_ENV` as the only
environment switch.

### `.gitignore`
Added `.tokensave/`, `.code-review-graph/` (~13 MB of local AI caches) and
`.claude/settings.local.json` (machine-specific).

**No payment logic was modified.** Typecheck clean: `./node_modules/.bin/tsc --noEmit` → 0 errors.
(Note: `npx tsc` resolves to a decoy package in this repo — always use the local binary.)

---

## Verification procedure

1. `GET https://<prod-domain>/api/payments/phonepe/health`
2. Expect `"environment": "production"` and `phonepe_endpoints` showing `api.phonepe.com`
3. ⚠️ **Read the `checks` array, not the HTTP status code.** The pre-existing `oauth_token`
   check reports `unhealthy` whenever no token is cached — normal on a cold serverless
   start — so the endpoint often returns **503 even when healthy**. This was left as-is
   deliberately to avoid widening scope.
4. Only then run one small real transaction. Checkout must be on `mercury.phonepe.com`
   (no `-uat`) and the QR must open a real UPI payment, not the simulator.

---

## Architecture reference (for whoever picks this up)

| Layer | What |
|---|---|
| App | Next.js 15.3.6, App Router, on Vercel |
| **Database** | **MongoDB** via Payload CMS 3.54 (`@payloadcms/db-mongodb`) |
| Gateway | **PhonePe Checkout API v2 (OAuth)** |
| Config | Fully env-var driven; no hardcoded credentials |

Payment flow:

```
PaymentButton
  → POST /api/payments/phonepe/create-order
      → phonePeOAuthService.getAccessToken()   → {authUrl}/v1/oauth/token
      → phonePeServiceV2.initiatePayment()     → {apiUrl}/checkout/v2/pay
      → writes `payments` doc to Mongo (status: pending)
      → returns PhonePe redirectUrl
  → browser → PhonePe checkout page
  → PhonePe redirects → /checkout/payment-return?merchantOrderId=...
  → page polls GET /api/payments/phonepe/status?merchantOrderId=...
      → re-verifies with PhonePe, then creates the booking (status/route.ts, ~900 lines)
```

Notes:
- `src/services/payments/phonePeService.ts` is **v1 dead code** — nothing imports it.
  All five routes use `phonePeServiceV2`.
- `razorpay` is in `package.json` but PhonePe is the live path.
- PhonePe v2 uses `client_id`/`client_secret`/`client_version`, **not** the v1
  `merchantId`/`saltKey`. The env var names are legacy and misleading.
