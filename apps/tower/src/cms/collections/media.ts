import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CollectionConfig } from "payload";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export const Media: CollectionConfig = {
  slug: "media",
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
