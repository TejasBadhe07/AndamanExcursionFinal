import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import fs from 'fs';
import path from 'path';

async function uploadImage(payload: any, filePath: string, alt: string) {
  const absolutePath = path.resolve(filePath);
  const fileBuffer = fs.readFileSync(absolutePath);
  const fileName = path.basename(absolutePath);
  const ext = path.extname(fileName).toLowerCase();
  
  let mimeType = 'image/jpeg';
  if (ext === '.png') mimeType = 'image/png';
  else if (ext === '.webp') mimeType = 'image/webp';
  else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';

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
    const results: any = {};

    // 1. Upload all images first
    const rockFormationImageId = await uploadImage(
      payload,
      'public/images/exp/Coral-Reefs-Andaman.jpg',
      'Coral Reefs at Bharatpur Beach'
    );
    results.rockFormationImageId = rockFormationImageId;

    const photographyImageId = await uploadImage(
      payload,
      'public/images/exp/d051386c73026e7b4709b0b6dd1d1058.jpg',
      'Photography at Natural Rock Formation'
    );
    results.photographyImageId = photographyImageId;

    const marineExplorationImageId = await uploadImage(
      payload,
      'public/images/exp/photo-20251004-103944-3028803057.jpg',
      'Marine Exploration at Bharatpur Beach'
    );
    results.marineExplorationImageId = marineExplorationImageId;

    const cultureHeritageImageId = await uploadImage(
      payload,
      'public/images/exp/neil-island-travel-guide-natural-bridge.png',
      'Natural Rock Formation at Neil Island'
    );
    results.cultureHeritageImageId = cultureHeritageImageId;

    const heroImageId = await uploadImage(
      payload,
      'public/images/exp/8e7965b3-74e6-478a-bcda-088346037edd.jpeg',
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
