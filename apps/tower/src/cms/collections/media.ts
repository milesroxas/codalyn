import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CollectionConfig } from "payload";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export const Media: CollectionConfig = {
  slug: "media",
  // Payload's built-in folders: adds a `folder` field + folder browse view in
  // the admin so uploads stay organized (payload-folders collection is
  // auto-created).
  folders: true,
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  upload: {
    // Local-dev fallback only — on Vercel the storage-vercel-blob plugin takes over.
    staticDir: path.resolve(dirname, "../../../media"),
    mimeTypes: ["image/*", "video/*"],
    imageSizes: [
      { name: "thumbnail", width: 480 },
      { name: "card", width: 960 },
      { name: "hero", width: 1920 },
    ],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
    },
  ],
};
