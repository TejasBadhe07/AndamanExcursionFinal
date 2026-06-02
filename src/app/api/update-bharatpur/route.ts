import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

export async function GET() {
  try {
    const payload = await getPayload({ config });
    
    // Find the page
    const existing = await payload.find({
      collection: 'pages',
      where: {
        slug: { equals: 'bharatpur-beach' }
      }
    });
    
    if (existing.docs.length === 0) {
      return NextResponse.json({ success: false, message: 'Bharatpur Beach not found' });
    }
    
    const doc = existing.docs[0];
    
    // Modify content
    const serviceFeature = doc.pageContent?.content?.find((b: any) => b.blockType === 'serviceFeature') as any;
    if (serviceFeature) {
        serviceFeature.description = "The Natural Rock Formation has been named after the famous Howrah Bridge in Kolkata because of the resemblance it bears to a bridge. It is a Natural Engineering Marvel: The formation of this natural bridge is believed to be formed over thousands of years from dead corals and it is a great example of the marine and geological processes that shape our planet. The local community perceives the formation as something very special and respects its singularity while preserving the natural beauty of the same. This rock formation not only plays a part in the cultural heritage of this island but at the same time, it acts as a symbolic expression to the close intimate relation between nature and time.";
    }

    // Update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await payload.update({
      collection: 'pages',
      id: doc.id,
      data: {
        pageContent: doc.pageContent
      } as any
    });
    
    return NextResponse.json({ success: true, doc: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
