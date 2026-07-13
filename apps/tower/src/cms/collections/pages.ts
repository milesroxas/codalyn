import type { Access, CollectionConfig } from "payload";

/** Published pages are public; drafts are visible only to signed-in CMS editors. */
const publishedOrEditor: Access = ({ req }) => {
  if (req.user) return true;
  return { _status: { equals: "published" } };
};

export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "_status", "updatedAt"],
    preview: (data) => {
      const slug = typeof data?.slug === "string" ? data.slug : "";
      if (!slug) return null;
      // Same-origin relative URL; the preview route enables Next.js draft mode after checking Payload auth.
      const base = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
      return `${base}/api/cms/preview?slug=${encodeURIComponent(slug)}`;
    },
  },
  access: {
    read: publishedOrEditor,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        description: "URL path segment, e.g. `about` for /about.",
      },
    },
    {
      name: "hero",
      type: "group",
      fields: [
        { name: "heading", type: "text" },
        { name: "subheading", type: "textarea" },
        { name: "image", type: "upload", relationTo: "media" },
      ],
    },
    {
      name: "content",
      type: "richText",
    },
    {
      name: "seo",
      type: "group",
      fields: [
        { name: "title", type: "text" },
        { name: "description", type: "textarea" },
        { name: "image", type: "upload", relationTo: "media" },
      ],
    },
  ],
};
