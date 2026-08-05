import type { Block } from "payload";

/**
 * Horizontal reassurance strip per the Paper "Pricing" design: a bold claim
 * with supporting line on the left, checked items filling the row.
 */
export const FeatureStrip: Block = {
  slug: "featureStrip",
  interfaceName: "FeatureStripBlock",
  labels: {
    singular: "Feature Strip",
    plural: "Feature Strips",
  },
  fields: [
    { name: "heading", type: "text", required: true },
    {
      name: "subheading",
      type: "text",
      admin: { description: "Supporting line under the heading." },
    },
    {
      name: "items",
      type: "array",
      required: true,
      minRows: 1,
      maxRows: 4,
      labels: { singular: "Item", plural: "Items" },
      fields: [{ name: "text", type: "text", required: true }],
    },
  ],
};
