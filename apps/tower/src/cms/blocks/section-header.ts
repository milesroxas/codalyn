import type { Block } from "payload";

/**
 * Section header leading into a Content section, per the Paper "Block /
 * Section Header" design: small uppercase eyebrow over a large left-aligned
 * statement. Top-level layout block — sits between sections, not inside them.
 */
export const SectionHeader: Block = {
  slug: "sectionHeader",
  interfaceName: "SectionHeaderBlock",
  labels: {
    singular: "Section Header",
    plural: "Section Headers",
  },
  fields: [
    {
      name: "eyebrow",
      type: "text",
      admin: {
        description: "Short uppercase kicker above the statement, e.g. `CMS Slots`.",
      },
    },
    {
      name: "heading",
      type: "text",
      required: true,
      admin: {
        description: "Section statement, e.g. `Unique content sections for collection template pages`.",
      },
    },
  ],
};
