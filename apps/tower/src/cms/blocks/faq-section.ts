import type { Block } from "payload";

/**
 * Split FAQ section per the Paper "Pricing" design: eyebrow + statement on the
 * left, hairline-separated question/answer list on the right.
 */
export const FaqSection: Block = {
  slug: "faqSection",
  interfaceName: "FaqSectionBlock",
  labels: {
    singular: "FAQ Section",
    plural: "FAQ Sections",
  },
  fields: [
    {
      name: "eyebrow",
      type: "text",
      admin: { description: "Short kicker above the heading, e.g. `FAQ`." },
    },
    { name: "heading", type: "text", required: true },
    {
      name: "items",
      type: "array",
      required: true,
      minRows: 1,
      labels: { singular: "Question", plural: "Questions" },
      fields: [
        { name: "question", type: "text", required: true },
        { name: "answer", type: "textarea", required: true },
      ],
    },
  ],
};
