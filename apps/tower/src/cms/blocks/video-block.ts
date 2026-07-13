import type { Block } from "payload";

/** Cloudflare Stream video row nested inside a Content section. */
export const VideoBlock: Block = {
  slug: "videoBlock",
  interfaceName: "VideoBlock",
  labels: {
    singular: "Video",
    plural: "Videos",
  },
  fields: [
    {
      name: "video",
      type: "relationship",
      relationTo: "stream-videos",
      required: true,
    },
    {
      name: "playback",
      type: "select",
      required: true,
      defaultValue: "clickToPlay",
      options: [
        { label: "Click to play (poster + controls)", value: "clickToPlay" },
        { label: "Ambient loop (autoplay, muted)", value: "loop" },
      ],
      admin: {
        description: "Click to play suits demos with audio; ambient loop suits silent background footage.",
      },
    },
    {
      name: "caption",
      type: "text",
    },
  ],
};
