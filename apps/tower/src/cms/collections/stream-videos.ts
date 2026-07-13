import type { CollectionConfig } from "payload";
import { normalizeStreamUid } from "../../shared/lib/cloudflare-stream";

/**
 * Registry of Cloudflare Stream videos. Files live in the Cloudflare account
 * (uploaded via the dashboard); the CMS stores only the stable video UID plus
 * editor-facing metadata, so one video can be referenced from any page. UIDs
 * are normalized/validated at the boundary — playback URLs are built at render
 * time from the env-configured customer subdomain.
 */
export const StreamVideos: CollectionConfig = {
  slug: "stream-videos",
  labels: {
    singular: "Stream Video",
    plural: "Stream Videos",
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "uid", "updatedAt"],
    description:
      "Videos hosted on Cloudflare Stream. Upload in the Cloudflare dashboard (Stream → Videos), then register the video UID here to use it on pages.",
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      admin: {
        description: "Editor-facing name; also used as the player's accessibility label.",
      },
    },
    {
      name: "uid",
      type: "text",
      required: true,
      unique: true,
      index: true,
      hooks: {
        // Normalize pasted values (whitespace, wrapped shapes) before validation.
        beforeValidate: [({ value }) => normalizeStreamUid(value) ?? value],
      },
      validate: (value: string | null | undefined) =>
        normalizeStreamUid(value)
          ? true
          : "Enter a Cloudflare Stream video UID (letters, digits, `.`, `_`, `-` only) from the dashboard.",
      admin: {
        description: "Cloudflare Stream video UID, e.g. `e652512a1aec7357bd78d18c594534d3`.",
      },
    },
    {
      name: "poster",
      type: "upload",
      relationTo: "media",
      admin: {
        description: "Optional poster image. Defaults to the Stream thumbnail when unset.",
      },
    },
  ],
};
