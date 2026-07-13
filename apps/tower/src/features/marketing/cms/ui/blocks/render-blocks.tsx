import type { Page } from "@/payload-types";
import { ContentBlock } from "./content-block";
import { SectionHeaderBlock } from "./section-header-block";

type RenderBlocksProps = {
  blocks: NonNullable<Page["layout"]>;
};

/**
 * Renders a page's `layout` blocks in order. Register new top-level block
 * components here alongside their config in `src/cms/blocks`.
 */
function RenderBlocks({ blocks }: RenderBlocksProps) {
  return (
    <>
      {blocks.map((block, index) => {
        const key = block.id ?? `${block.blockType}-${index}`;
        switch (block.blockType) {
          case "sectionHeader":
            return <SectionHeaderBlock key={key} {...block} />;
          case "content":
            return <ContentBlock key={key} {...block} />;
          default:
            return null;
        }
      })}
    </>
  );
}

export { RenderBlocks };
