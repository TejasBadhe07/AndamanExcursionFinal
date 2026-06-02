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
    // #1 and #2
    const banner = doc.pageContent?.content?.find((b: any) => b.blockType === 'secondaryBanner') as any;
    if (banner) {
        banner.title = "The Hidden Treasure of Neil Island";
        banner.subtitle = "Bharatpur Beach";
    }
    
    // #3 Activities and Adventure -> Culture and Heritage
    const serviceFeature = doc.pageContent?.content?.find((b: any) => b.blockType === 'serviceFeature') as any;
    if (serviceFeature) {
        serviceFeature.title = "Culture and Heritage";
        serviceFeature.specialWord = "Heritage";
    }
    
    // #4 Culture and Heritage -> Things to do
    const visualCategory = doc.pageContent?.content?.find((b: any) => b.blockType === 'visualCategoryGrid') as any;
    if (visualCategory) {
        visualCategory.title = "Things to do";
        visualCategory.specialWord = "do";
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
