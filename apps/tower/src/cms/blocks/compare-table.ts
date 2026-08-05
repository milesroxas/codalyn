import type { Block } from "payload";

/**
 * Fixed-lane comparison table per the Paper "Pricing" design: a column per
 * plan (one optionally accented), rows of label + one cell per column, and a
 * footnote for cap/override caveats. Cells are plain text; authors keep cell
 * count aligned with the column count (extra cells are ignored, missing cells
 * render empty).
 */
export const CompareTable: Block = {
  slug: "compareTable",
  interfaceName: "CompareTableBlock",
  labels: {
    singular: "Compare Table",
    plural: "Compare Tables",
  },
  fields: [
    {
      name: "columns",
      type: "array",
      required: true,
      minRows: 1,
      maxRows: 4,
      labels: { singular: "Column", plural: "Columns" },
      fields: [
        { name: "label", type: "text", required: true },
        {
          name: "accent",
          type: "checkbox",
          defaultValue: false,
          admin: { description: "Accent-colored column header (use for the featured plan)." },
        },
      ],
    },
    {
      name: "rows",
      type: "array",
      required: true,
      minRows: 1,
      labels: { singular: "Row", plural: "Rows" },
      fields: [
        { name: "label", type: "text", required: true },
        {
          name: "cells",
          type: "array",
          required: true,
          minRows: 1,
          maxRows: 4,
          labels: { singular: "Cell", plural: "Cells" },
          fields: [
            { name: "value", type: "text", required: true },
            {
              name: "muted",
              type: "checkbox",
              defaultValue: false,
              admin: { description: "De-emphasize this cell (e.g. `Join only`)." },
            },
          ],
        },
      ],
    },
    {
      name: "footnote",
      type: "textarea",
      admin: { description: "Small print below the table, e.g. where live caps are shown." },
    },
  ],
};
