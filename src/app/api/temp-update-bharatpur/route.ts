import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

export async function GET() {
  try {
    const payload = await getPayload({ config });
    
    // Find the page
    const pages = await payload.find({
      collection: 'pages',
      where: {
        slug: {
          equals: 'bharatpur-beach',
        },
      },
      depth: 1, // Need some depth to get the blocks, but not too much
    });

    if (pages.docs.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const page = pages.docs[0];
    const content = page.pageContent?.content || [];

    // Make the requested changes
    const updatedContent = content.map((block: any) => {
      if (block.blockType === 'secondaryBanner') {
        return {
          ...block,
          subtitle: 'The Hidden Treasure of Neil Island',
          description: 'Neil Island, in the Andaman and Nicobar Islands, is one of the best-known islands of the archipelago because of its fabulous natural scenery and peaceful atmosphere. Among the innumerable places of interest, the Natural Rock Formation is the most magnificent natural wonder and thus uniquely calls itself the "Howrah Bridge" among the local people. This salient rock formation, moulded by the relentless forces of nature, offers an opportunity for visitors to perceive the raw beauty of coral structures in the Andaman Sea. Indeed, this place manifests its rich marine ecosystem and geological history, which is destined to be one of the must-visit spots for any nature lover or thrill-seeker.',
        };
      }
      
      if (block.blockType === 'visualCategoryGrid') {
        // Change "Activities and Adventure" to "Culture and Heritage"
        // In the previous script it was "Activities and Adventure" for title
        if (block.title === 'Activities and Adventure' || block.title === 'Things to do') {
          return {
            ...block,
            title: 'Culture and Heritage',
            specialWord: 'Heritage',
          };
        }
      }

      if (block.blockType === 'contentSideImage') {
        // If it's the specific content block
        if (block.content?.[0]?.children?.[0]?.text?.includes('Unlike other beaches in Neil Island')) {
          return {
            ...block,
            content: [
              {
                children: [
                  {
                    text: 'The Natural Rock Formation has been named after the famous Howrah Bridge in Kolkata because of the resemblance it bears to a bridge. It is a Natural Engineering Marvel: The formation of this natural bridge is believed to be formed over thousands of years from dead corals and it is a great example of the marine and geological processes that shape our planet. The local community perceives the formation as something very special and respects its singularity while preserving the natural beauty of the same. This rock formation not only plays a part in the cultural heritage of this island but at the same time, it acts as a symbolic expression to the close intimate relation between nature and time.',
                  }
                ]
              }
            ]
          };
        }
      }

      return block;
    });

    // Update the page
    const result = await payload.update({
      collection: 'pages',
      id: page.id,
      data: {
        pageContent: {
          content: updatedContent,
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    return NextResponse.json({ success: true, doc: result });
  } catch (error: any) {
    console.error('Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
