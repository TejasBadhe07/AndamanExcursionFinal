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
        const snorkeling = visualCategory.categories.find((c: any) => c.subtitle === "Snorkeling");
        if (snorkeling) {
            snorkeling.subtitle = "Photography";
            snorkeling.title = "The Natural Rock Formation is excellent for taking photos. Isolated rock formations against the limpid brilliant blue water provide a dramatic backdrop. Shallow pools created by the receding tide provide an ideal opportunity for photography of the marine life and this special rock formation.";
        }
        
        const swimming = visualCategory.categories.find((c: any) => c.subtitle === "Swimming");
        if (swimming) {
            swimming.subtitle = "Marine Exploration";
            swimming.title = "Except for the rock formation, the surrounding area is a storehouse of marine biodiversity. The tidal pools are hosts to various species, making it an excellent spot for nature observation and photography.";
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
