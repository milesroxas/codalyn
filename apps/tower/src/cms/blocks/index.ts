import { CompareTable } from "./compare-table";
import { Content } from "./content";
import { CtaBand } from "./cta-band";
import { FaqSection } from "./faq-section";
import { FeatureStrip } from "./feature-strip";
import { PricingPlans } from "./pricing-plans";
import { SectionHeader } from "./section-header";

/**
 * Blocks available in a page's `layout` field. The page hero is not a block —
 * it is a dedicated group on the Pages collection (Hero tab), present on every
 * page unless its variant is set to None. Nested layout blocks live inside
 * `Content`.
 */
export const pageLayoutBlocks = [SectionHeader, Content, PricingPlans, FeatureStrip, CompareTable, FaqSection, CtaBand];

export { CompareTable } from "./compare-table";
export { Content } from "./content";
export { CtaBand } from "./cta-band";
export { FaqSection } from "./faq-section";
export { FeatureStrip } from "./feature-strip";
export { MediaBlock } from "./media-block";
export { PricingPlans } from "./pricing-plans";
export { SectionHeader } from "./section-header";
export { TwoColListLeft } from "./two-col-list-left";
export { VideoBlock } from "./video-block";
