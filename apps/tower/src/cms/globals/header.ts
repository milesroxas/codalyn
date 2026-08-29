import type { GlobalConfig } from "payload";
import { linkGroup } from "../fields/link";
import { revalidateCmsHeaderAfterChange } from "../hooks/revalidate-cms-cache";

/**
 * Site header: logo, top-level navigation (plain links or one-level
 * dropdowns), and up to two call-to-action buttons. A global rather than a
 * collection — the site has exactly one header.
 */
export const Header: GlobalConfig = {
  slug: "header",
  admin: {
    group: "Site",
    description: "Logo, navigation, and call-to-action buttons shown on every page.",
  },
  access: {
    read: () => true,
    update: ({ req }) => Boolean(req.user),
  },
  hooks: {
    // Purge the cached header read (see shared/lib/cms/cache-tags) so nav edits are visible immediately.
    afterChange: [revalidateCmsHeaderAfterChange],
  },
  fields: [
    {
      name: "logo",
      type: "upload",
      relationTo: "media",
      admin: {
        description: "Site logo at the left of the header. Falls back to the built-in wordmark when unset.",
      },
    },
    {
      name: "navItems",
      type: "array",
      labels: {
        singular: "Nav Item",
        plural: "Nav Items",
      },
      admin: {
        description: "Top-level navigation, rendered left to right.",
      },
      fields: [
        {
          name: "type",
          type: "radio",
          required: true,
          defaultValue: "link",
          options: [
            { label: "Link", value: "link" },
            { label: "Dropdown", value: "dropdown" },
          ],
          admin: {
            layout: "horizontal",
          },
        },
        {
          name: "label",
          type: "text",
          required: true,
        },
        linkGroup({
          condition: (_data, siblingData) => siblingData?.type === "link",
        }),
        {
          name: "items",
          type: "array",
          labels: {
            singular: "Dropdown Link",
            plural: "Dropdown Links",
          },
          admin: {
            condition: (_data, siblingData) => siblingData?.type === "dropdown",
            description: "Links shown in the dropdown panel.",
          },
          fields: [
            {
              name: "label",
              type: "text",
              required: true,
            },
            {
              name: "description",
              type: "text",
              admin: {
                description: "Optional supporting line under the label.",
              },
            },
            linkGroup(),
          ],
        },
      ],
    },
    {
      name: "actions",
      type: "array",
      maxRows: 2,
      labels: {
        singular: "Call to Action",
        plural: "Calls to Action",
      },
      admin: {
        description: "Call-to-action buttons at the right of the header.",
      },
      fields: [
        {
          name: "label",
          type: "text",
          required: true,
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
        linkGroup(),
      ],
    },
  ],
};
