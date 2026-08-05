import type { Block } from "payload";

/**
 * Closing call-to-action band per the Paper "Pricing" design: centered
 * statement + supporting line above up to two action buttons, separated from
 * the content above by a hairline.
 */
export const CtaBand: Block = {
  slug: "ctaBand",
  interfaceName: "CtaBandBlock",
  labels: {
    singular: "CTA Band",
    plural: "CTA Bands",
  },
  fields: [
    { name: "heading", type: "text", required: true },
    {
      name: "subheading",
      type: "textarea",
      admin: { description: "Supporting line under the heading." },
    },
    {
      name: "actions",
      type: "array",
      maxRows: 2,
      labels: { singular: "Action", plural: "Actions" },
      fields: [
        { name: "label", type: "text", required: true },
        {
          name: "href",
          type: "text",
          required: true,
          admin: { description: "Relative path (`/sign-up`) or absolute URL." },
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
};
