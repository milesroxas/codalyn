import type { Block } from "payload";

/** Standalone media (image/video) row nested inside a Content section. */
export const MediaBlock: Block = {
  slug: "mediaBlock",
  interfaceName: "MediaBlock",
  labels: {
    singular: "Media",
    plural: "Media",
  },
  fields: [
    {
      name: "media",
      type: "upload",
      relationTo: "media",
      required: true,
    },
    {
      name: "caption",
      type: "text",
    },
  ],
};
