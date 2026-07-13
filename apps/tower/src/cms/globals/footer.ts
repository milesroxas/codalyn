import type { GlobalConfig } from "payload";
import { linkGroup } from "../fields/link";

/**
 * Site footer: logo + tagline, grouped link columns, social links, and the
 * bottom legal bar. A global rather than a collection — the site has exactly
 * one footer.
 */
export const Footer: GlobalConfig = {
  slug: "footer",
  admin: {
    group: "Site",
    description: "Link columns, social links, and legal bar shown at the bottom of every page.",
  },
  access: {
    read: () => true,
    update: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: "logo",
      type: "upload",
      relationTo: "media",
      admin: {
        description: "Footer logo. Falls back to the built-in wordmark when unset.",
      },
    },
    {
      name: "tagline",
      type: "textarea",
      admin: {
        description: "Short blurb under the logo.",
      },
    },
    {
      name: "columns",
      type: "array",
      maxRows: 4,
      labels: {
        singular: "Link Column",
        plural: "Link Columns",
      },
      admin: {
        description: "Grouped link lists, rendered left to right.",
      },
      fields: [
        {
          name: "heading",
          type: "text",
          required: true,
        },
        {
          name: "links",
          type: "array",
          fields: [
            {
              name: "label",
              type: "text",
              required: true,
            },
            linkGroup(),
          ],
        },
      ],
    },
    {
      name: "socialLinks",
      type: "array",
      labels: {
        singular: "Social Link",
        plural: "Social Links",
      },
      fields: [
        {
          name: "platform",
          type: "select",
          required: true,
          options: [
            { label: "X (Twitter)", value: "x" },
            { label: "GitHub", value: "github" },
            { label: "LinkedIn", value: "linkedin" },
            { label: "YouTube", value: "youtube" },
            { label: "Instagram", value: "instagram" },
          ],
        },
        {
          name: "url",
          type: "text",
          required: true,
          admin: {
            description: "Full profile URL, e.g. `https://github.com/codalyn`.",
          },
        },
      ],
    },
    {
      name: "legalLinks",
      type: "array",
      labels: {
        singular: "Legal Link",
        plural: "Legal Links",
      },
      admin: {
        description: "Bottom bar links, e.g. Privacy, Terms, Cookies.",
      },
      fields: [
        {
          name: "label",
          type: "text",
          required: true,
        },
        linkGroup(),
      ],
    },
    {
      name: "copyright",
      type: "text",
      admin: {
        description: "Copyright line without the year — the current year is added at render time.",
      },
    },
  ],
};
