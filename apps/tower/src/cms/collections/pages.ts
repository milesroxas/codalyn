import type { Access, CollectionConfig } from "payload";
import { pageLayoutBlocks } from "../blocks";

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
        position: "sidebar",
        description: "URL path segment, e.g. `about` for /about.",
      },
    },
    // Unnamed tabs are admin presentation only — field names stay top-level,
    // so the stored data shape (and migrations) are unchanged.
    {
      type: "tabs",
      tabs: [
        {
          label: "Hero",
          description: "Every page leads with a hero. Set the variant to None to intentionally omit it.",
          fields: [
            {
              name: "hero",
              type: "group",
              label: false,
              fields: [
                {
                  name: "variant",
                  type: "select",
                  required: true,
                  defaultValue: "center",
                  options: [
                    { label: "Center", value: "center" },
                    { label: "None (no hero)", value: "none" },
                  ],
                  admin: {
                    description: "Hero layout variant.",
                  },
                },
                {
                  name: "eyebrow",
                  type: "text",
                  admin: {
                    condition: (_data, siblingData) => siblingData?.variant !== "none",
                    description: "Short kicker line above the heading.",
                  },
                },
                {
                  name: "heading",
                  type: "text",
                  validate: (value: string | null | undefined, { siblingData }: { siblingData: unknown }) => {
                    const variant = (siblingData as { variant?: string } | undefined)?.variant;
                    if (variant === "none" || value?.trim()) return true;
                    return "Heading is required unless the hero variant is None.";
                  },
                  admin: {
                    condition: (_data, siblingData) => siblingData?.variant !== "none",
                  },
                },
                {
                  name: "subheading",
                  type: "textarea",
                  admin: {
                    condition: (_data, siblingData) => siblingData?.variant !== "none",
                  },
                },
                {
                  // Field name predates the video-capable media slot; kept as
                  // `image` so legacy rows' hero_image_id column carries over.
                  name: "image",
                  type: "upload",
                  relationTo: "media",
                  label: "Media",
                  admin: {
                    condition: (_data, siblingData) => siblingData?.variant !== "none",
                    description: "Image or video shown below the hero copy.",
                  },
                },
                {
                  name: "video",
                  type: "relationship",
                  relationTo: "stream-videos",
                  label: "Stream Video",
                  admin: {
                    condition: (_data, siblingData) => siblingData?.variant !== "none",
                    description: "Cloudflare Stream video. Takes precedence over Media when both are set.",
                  },
                },
                {
                  name: "videoPlayback",
                  type: "select",
                  required: true,
                  defaultValue: "clickToPlay",
                  options: [
                    { label: "Click to play (poster + controls)", value: "clickToPlay" },
                    { label: "Ambient loop (autoplay, muted)", value: "loop" },
                  ],
                  admin: {
                    condition: (_data, siblingData) => siblingData?.variant !== "none" && Boolean(siblingData?.video),
                    description: "Click to play suits demos with audio; ambient loop suits silent background footage.",
                  },
                },
                {
                  name: "actions",
                  type: "array",
                  maxRows: 2,
                  admin: {
                    condition: (_data, siblingData) => siblingData?.variant !== "none",
                    description: "Call-to-action buttons.",
                  },
                  fields: [
                    {
                      name: "label",
                      type: "text",
                      required: true,
                    },
                    {
                      name: "href",
                      type: "text",
                      required: true,
                      admin: {
                        description: "Relative path (`/sign-up`) or absolute URL.",
                      },
                    },
                    {
                      name: "appearance",
                      type: "select",
                      required: true,
                      defaultValue: "primary",
                      options: [
                        { label: "Primary", value: "primary" },
                        { label: "Secondary", value: "secondary" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: "Content",
          fields: [
            {
              name: "layout",
              type: "blocks",
              blocks: pageLayoutBlocks,
              admin: {
                description: "Page sections rendered top to bottom, below the hero.",
              },
            },
          ],
        },
        {
          label: "SEO",
          description: "Search and social sharing metadata. Falls back to the page title and hero subheading.",
          fields: [
            {
              name: "seo",
              type: "group",
              label: false,
              fields: [
                { name: "title", type: "text" },
                { name: "description", type: "textarea" },
                { name: "image", type: "upload", relationTo: "media" },
              ],
            },
          ],
        },
        // Legacy body field, superseded by `layout` blocks. The old hero group
        // was absorbed into the Hero tab (same column names — no data loss).
        // Drop tab + field in a follow-up migration once content is moved over.
        {
          label: "Legacy",
          description: "Superseded by Content layout blocks — do not author new pages here.",
          fields: [
            {
              name: "content",
              type: "richText",
              admin: {
                description: "Legacy — use a Content block in the Content tab instead.",
              },
            },
          ],
        },
      ],
    },
  ],
};
