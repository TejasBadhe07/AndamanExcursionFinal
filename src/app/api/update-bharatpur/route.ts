import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

async function uploadImageFromUrl(payload: any, imageUrl: string, fileName: string, alt: string) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${imageUrl} - ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  
  let mimeType = 'image/jpeg';
  if (ext === 'png') mimeType = 'image/png';
  else if (ext === 'webp') mimeType = 'image/webp';

  const mediaDoc = await payload.create({
    collection: 'media',
    data: {
      alt: alt,
    },
    file: {
      data: fileBuffer,
      mimetype: mimeType,
      name: fileName,
      size: fileBuffer.length,
    },
  });

  return mediaDoc.id;
}

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config });
    const baseUrl = new URL(request.url).origin;
    
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
    const results: any = {};

    // 1. Upload all images from the public URL
    const rockFormationImageId = await uploadImageFromUrl(
      payload,
      `${baseUrl}/images/exp/Coral-Reefs-Andaman.jpg`,
      'Coral-Reefs-Andaman.jpg',
      'Coral Reefs at Bharatpur Beach'
    );
    results.rockFormationImageId = rockFormationImageId;

    const photographyImageId = await uploadImageFromUrl(
      payload,
      `${baseUrl}/images/exp/d051386c73026e7b4709b0b6dd1d1058.jpg`,
      'd051386c73026e7b4709b0b6dd1d1058.jpg',
      'Photography at Natural Rock Formation'
    );
    results.photographyImageId = photographyImageId;

    const marineExplorationImageId = await uploadImageFromUrl(
      payload,
      `${baseUrl}/images/exp/photo-20251004-103944-3028803057.jpg`,
      'photo-20251004-103944-3028803057.jpg',
      'Marine Exploration at Bharatpur Beach'
    );
    results.marineExplorationImageId = marineExplorationImageId;

    const cultureHeritageImageId = await uploadImageFromUrl(
      payload,
      `${baseUrl}/images/exp/neil-island-travel-guide-natural-bridge.png`,
      'neil-island-travel-guide-natural-bridge.png',
      'Natural Rock Formation at Neil Island'
    );
    results.cultureHeritageImageId = cultureHeritageImageId;

    const heroImageId = await uploadImageFromUrl(
      payload,
      `${baseUrl}/images/exp/8e7965b3-74e6-478a-bcda-088346037edd.jpeg`,
      '8e7965b3-74e6-478a-bcda-088346037edd.jpeg',
      'Bharatpur Beach Hero Image'
    );
    results.heroImageId = heroImageId;

    // 2. Update the page content
    const visualCategory = doc.pageContent?.content?.find((b: any) => b.blockType === 'visualCategoryGrid') as any;
    if (visualCategory && visualCategory.categories) {
      // Remove Beach Relaxation card
      visualCategory.categories = visualCategory.categories.filter(
        (c: any) => c.subtitle !== 'Beach Relaxation'
      );

      // Update Rock Formation and Marine Life image
      const rockCard = visualCategory.categories.find((c: any) => c.subtitle === 'Rock Formation and Marine Life');
      if (rockCard) {
        rockCard.image = rockFormationImageId;
      }

      // Update Photography image
      const photoCard = visualCategory.categories.find((c: any) => c.subtitle === 'Photography');
      if (photoCard) {
        photoCard.image = photographyImageId;
      }

      // Update Marine Exploration image
      const marineCard = visualCategory.categories.find((c: any) => c.subtitle === 'Marine Exploration');
      if (marineCard) {
        marineCard.image = marineExplorationImageId;
      }
    }

    // Update Culture and Heritage section image
    const serviceFeature = doc.pageContent?.content?.find((b: any) => b.blockType === 'serviceFeature') as any;
    if (serviceFeature) {
      serviceFeature.image = cultureHeritageImageId;
    }

    // Update hero banner image
    const banner = doc.pageContent?.content?.find((b: any) => b.blockType === 'secondaryBanner') as any;
    if (banner) {
      banner.image = heroImageId;
    }

    // 3. Save the updated page
    const updated = await payload.update({
      collection: 'pages',
      id: doc.id,
      data: {
        pageContent: doc.pageContent
      } as any
    });

    results.success = true;
    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 500 });
  }
}
