import type { ContentBlock as ContentBlockProps } from "@/payload-types";
import { MediaBlock } from "./media-block";
import { TwoColListLeftBlock } from "./two-col-list-left-block";
import { VideoBlock } from "./video-block";

/** CMS content section — stacks nested layout blocks vertically. */
function ContentBlock({ blocks }: ContentBlockProps) {
  if (!blocks.length) {
    return null;
  }

  return (
    <section data-slot="cms-content" className="flex flex-col gap-12 py-16">
      {blocks.map((block, index) => {
        const key = block.id ?? `${block.blockType}-${index}`;
        switch (block.blockType) {
          case "twoColListLeft":
            return <TwoColListLeftBlock key={key} {...block} />;
          case "mediaBlock":
            return <MediaBlock key={key} {...block} />;
          case "videoBlock":
            return <VideoBlock key={key} {...block} />;
          default:
            return null;
        }
      })}
    </section>
  );
}

export { ContentBlock };
