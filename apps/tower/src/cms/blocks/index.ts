import { Content } from "./content";
import { SectionHeader } from "./section-header";

/**
 * Blocks available in a page's `layout` field. The page hero is not a block —
 * it is a dedicated group on the Pages collection (Hero tab), present on every
 * page unless its variant is set to None. Nested layout blocks live inside
 * `Content`.
 */
export const pageLayoutBlocks = [SectionHeader, Content];

export { Content } from "./content";
export { MediaBlock } from "./media-block";
export { SectionHeader } from "./section-header";
export { TwoColListLeft } from "./two-col-list-left";
export { VideoBlock } from "./video-block";
