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
    const visualCategory = doc.pageContent?.content?.find((b: any) => b.blockType === 'visualCategoryGrid') as any;
    if (visualCategory && visualCategory.categories) {
        const categoryItem = visualCategory.categories.find((c: any) => c.subtitle === "Glass Bottom Boat Ride");
        if (categoryItem) {
            categoryItem.subtitle = "Rock Formation and Marine Life";
            categoryItem.title = "During the low tide one can have a walk over the fully beheaded rocky surface, donned with all kinds of marine life. Colorful corals, starfishes, sea cucumbers, and even small octopuses are seen in the shallow pools formed in the receding tides.";
        }
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
