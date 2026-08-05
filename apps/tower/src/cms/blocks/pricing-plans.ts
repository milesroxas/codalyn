import type { Block } from "payload";

/**
 * Row of pricing plan cards per the Paper "Pricing" design: up to four cards,
 * one optionally featured (gradient border + primary CTA), each with a price,
 * one-line fit statement, CTA, and check-list of features. An optional trust
 * line (dot-separated reassurances) renders above the cards.
 */
export const PricingPlans: Block = {
  slug: "pricingPlans",
  interfaceName: "PricingPlansBlock",
  labels: {
    singular: "Pricing Plans",
    plural: "Pricing Plans",
  },
  fields: [
    {
      name: "trustItems",
      type: "array",
      maxRows: 4,
      labels: { singular: "Trust Item", plural: "Trust Items" },
      admin: {
        description: "Short reassurances shown dot-separated above the cards, e.g. `Cancel anytime`.",
      },
      fields: [{ name: "text", type: "text", required: true }],
    },
    {
      name: "plans",
      type: "array",
      required: true,
      minRows: 1,
      maxRows: 4,
      labels: { singular: "Plan", plural: "Plans" },
      fields: [
        { name: "name", type: "text", required: true },
        {
          name: "price",
          type: "text",
          required: true,
          admin: { description: "Display price, e.g. `$12`. Keep in sync with Stripe prices." },
        },
        {
          name: "priceSuffix",
          type: "text",
          admin: { description: "Text after the price, e.g. `per month` or `per seat / month`." },
        },
        {
          name: "badge",
          type: "text",
          admin: { description: "Optional highlight badge, e.g. `Most popular`." },
        },
        {
          name: "bestFor",
          type: "text",
          admin: { description: "One-line fit statement under the price." },
        },
        {
          name: "featured",
          type: "checkbox",
          defaultValue: false,
          admin: { description: "Gradient border + primary CTA treatment. Feature at most one plan." },
        },
        {
          name: "cta",
          type: "group",
          fields: [
            { name: "label", type: "text", required: true },
            {
              name: "href",
              type: "text",
              required: true,
              admin: { description: "Relative path (`/sign-up`) or absolute URL." },
            },
          ],
        },
        {
          name: "features",
          type: "array",
          required: true,
          minRows: 1,
          labels: { singular: "Feature", plural: "Features" },
          fields: [{ name: "text", type: "text", required: true }],
        },
      ],
    },
  ],
};
