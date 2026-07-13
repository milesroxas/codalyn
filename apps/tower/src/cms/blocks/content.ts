import type { Block } from "payload";
import { MediaBlock } from "./media-block";
import { TwoColListLeft } from "./two-col-list-left";
import { VideoBlock } from "./video-block";

/**
 * Generic content section — a vertical stack of nested layout blocks.
 * Register new nested block types here as the section library grows.
 */
export const Content: Block = {
  slug: "content",
  interfaceName: "ContentBlock",
  labels: {
    singular: "Content",
    plural: "Content Sections",
  },
  fields: [
    {
      name: "blocks",
      type: "blocks",
      required: true,
      minRows: 1,
      blocks: [TwoColListLeft, MediaBlock, VideoBlock],
    },
  ],
};
