import type { Block } from "payload";

/**
 * Left-aligned two-column list nested inside a Content section: each column is
 * a bold label ("Designer") over single-line items. Matches the Paper
 * "Block / 2 col list left" design.
 */
export const TwoColListLeft: Block = {
  slug: "twoColListLeft",
  interfaceName: "TwoColListLeftBlock",
  labels: {
    singular: "2 Col List Left",
    plural: "2 Col List Left",
  },
  fields: [
    {
      name: "columns",
      type: "array",
      required: true,
      minRows: 1,
      maxRows: 2,
      labels: {
        singular: "Column",
        plural: "Columns",
      },
      fields: [
        {
          name: "label",
          type: "text",
          required: true,
          admin: {
            description: "Column heading, e.g. `Designer`.",
          },
        },
        {
          name: "items",
          type: "array",
          required: true,
          minRows: 1,
          labels: {
            singular: "Item",
            plural: "Items",
          },
          fields: [
            {
              name: "text",
              type: "text",
              required: true,
            },
          ],
        },
      ],
    },
  ],
};
