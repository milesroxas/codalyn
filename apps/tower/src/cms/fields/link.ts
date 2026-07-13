import type { Field } from "payload";

type LinkGroupOptions = {
  /** Field name for the group. Defaults to `link`. */
  name?: string;
  /** Show the group only when the condition passes (e.g. nav item type is `link`). */
  condition?: (data: Partial<Record<string, unknown>>, siblingData: Partial<Record<string, unknown>>) => boolean;
};

/**
 * Reusable link destination group for navigation fields. Internal links
 * reference pages by ID — stable across slug renames — and resolve to the
 * page's current slug at render time. Custom links take a relative path or
 * absolute URL for destinations outside the Pages collection.
 */
export function linkGroup({ name = "link", condition }: LinkGroupOptions = {}): Field {
  return {
    name,
    type: "group",
    label: false,
    admin: condition ? { condition } : undefined,
    fields: [
      {
        name: "linkType",
        type: "radio",
        required: true,
        defaultValue: "internal",
        options: [
          { label: "Internal page", value: "internal" },
          { label: "Custom URL", value: "custom" },
        ],
        admin: {
          layout: "horizontal",
        },
      },
      {
        name: "page",
        type: "relationship",
        relationTo: "pages",
        validate: (value: unknown, { siblingData }: { siblingData: unknown }) => {
          const linkType = (siblingData as { linkType?: string } | undefined)?.linkType;
          if (linkType !== "internal" || value != null) return true;
          return "Select a page for internal links.";
        },
        admin: {
          condition: (_data, siblingData) => siblingData?.linkType === "internal",
        },
      },
      {
        name: "url",
        type: "text",
        validate: (value: string | null | undefined, { siblingData }: { siblingData: unknown }) => {
          const linkType = (siblingData as { linkType?: string } | undefined)?.linkType;
          if (linkType !== "custom" || value?.trim()) return true;
          return "Enter a URL for custom links.";
        },
        admin: {
          condition: (_data, siblingData) => siblingData?.linkType === "custom",
          description: "Relative path (`/pricing`) or absolute URL.",
        },
      },
      {
        name: "newTab",
        type: "checkbox",
        label: "Open in new tab",
        defaultValue: false,
      },
    ],
  };
}
