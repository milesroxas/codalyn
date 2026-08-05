import type { Page } from "@/payload-types";
import { CompareTableBlock } from "./compare-table-block";
import { ContentBlock } from "./content-block";
import { CtaBandBlock } from "./cta-band-block";
import { FaqSectionBlock } from "./faq-section-block";
import { FeatureStripBlock } from "./feature-strip-block";
import { PricingPlansBlock } from "./pricing-plans-block";
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
          case "pricingPlans":
            return <PricingPlansBlock key={key} {...block} />;
          case "featureStrip":
            return <FeatureStripBlock key={key} {...block} />;
          case "compareTable":
            return <CompareTableBlock key={key} {...block} />;
          case "faqSection":
            return <FaqSectionBlock key={key} {...block} />;
          case "ctaBand":
            return <CtaBandBlock key={key} {...block} />;
          default:
            return null;
        }
      })}
    </>
  );
}

export { RenderBlocks };
