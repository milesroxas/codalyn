import { getPayload } from "payload";
import config from "../src/payload.config";

/**
 * One-off seed: create (or replace) the /pricing page composed of the new
 * pricing blocks, mirroring the Paper "Pricing" design 1:1.
 */
async function run() {
  const payload = await getPayload({ config });

  const existing = await payload.find({ collection: "pages", where: { slug: { equals: "pricing" } } });
  for (const doc of existing.docs) {
    await payload.delete({ collection: "pages", id: doc.id });
    payload.logger.info(`Deleted existing pricing page ${doc.id}`);
  }

  const page = await payload.create({
    collection: "pages",
    draft: false,
    data: {
      title: "Pricing",
      slug: "pricing",
      _status: "published",
      hero: {
        variant: "center",
        eyebrow: "Pricing",
        heading: "Beacon is free. Pay when your team grows.",
        subheading:
          "The Beacon app for Webflow costs nothing on your own site. Tower plans add more workspaces, higher limits, and team seats — one subscription, cancel anytime.",
      },
      layout: [
        {
          blockType: "pricingPlans",
          trustItems: [
            { text: "No credit card required for Free" },
            { text: "Prices shown monthly" },
            { text: "Cancel anytime" },
          ],
          plans: [
            {
              name: "Free",
              price: "$0",
              priceSuffix: "forever",
              bestFor: "Try Codalyn on a single site of your own.",
              featured: false,
              cta: { label: "Start free", href: "/sign-up" },
              features: [
                { text: "1 workspace you own" },
                { text: "2,500 Webflow updates, 500 CMS writes, 25 image credits / month" },
                { text: "Join any Team workspace you're invited to" },
              ],
            },
            {
              name: "Pro",
              price: "$12",
              priceSuffix: "per month",
              badge: "Most popular",
              bestFor: "For freelancers running a few client sites solo.",
              featured: true,
              cta: { label: "Get Pro", href: "/sign-up" },
              features: [
                { text: "Up to 3 workspaces you own" },
                { text: "25,000 Webflow updates, 5,000 CMS writes, 500 image credits / month" },
                { text: "Your plan follows you across workspaces you own" },
              ],
            },
            {
              name: "Studio",
              price: "$29",
              priceSuffix: "per month",
              bestFor: "For studios managing many client sites.",
              featured: false,
              cta: { label: "Get Studio", href: "/sign-up" },
              features: [
                { text: "Up to 10 workspaces you own" },
                { text: "60,000 Webflow updates, 12,000 CMS writes, 1,500 image credits / month" },
                { text: "Your plan follows you across workspaces you own" },
              ],
            },
            {
              name: "Team",
              price: "$15",
              priceSuffix: "per seat / month",
              bestFor: "For teams working together in one shared workspace.",
              featured: false,
              cta: { label: "Start a Team", href: "/sign-up" },
              features: [
                { text: "Billed per seat, 6-seat minimum" },
                { text: "Usage pooled across the workspace — every seat adds to the shared monthly pool" },
                { text: "Roles, invites, and shared Webflow access" },
              ],
            },
          ],
        },
        {
          blockType: "featureStrip",
          heading: "Every plan includes the full product.",
          subheading: "Paid plans change limits and seats — never features.",
          items: [
            { text: "Beacon app inside the Webflow Designer" },
            { text: "Tower dashboard for workspaces and settings" },
            { text: "Secure Webflow OAuth and Data API access" },
          ],
        },
        {
          blockType: "sectionHeader",
          eyebrow: "Compare Plans",
          heading: "The same product on every plan. Here's exactly what changes.",
        },
        {
          blockType: "compareTable",
          columns: [
            { label: "Free", accent: false },
            { label: "Pro", accent: true },
            { label: "Studio", accent: false },
            { label: "Team", accent: false },
          ],
          rows: [
            {
              label: "Monthly price",
              cells: [{ value: "$0" }, { value: "$12" }, { value: "$29" }, { value: "$15 per seat, 6-seat min" }],
            },
            {
              label: "Billed to",
              cells: [{ value: "You" }, { value: "You" }, { value: "You" }, { value: "Your workspace" }],
            },
            {
              label: "Workspaces you can own",
              cells: [{ value: "1" }, { value: "3" }, { value: "10" }, { value: "1 shared workspace" }],
            },
            {
              label: "Webflow updates / month",
              cells: [
                { value: "2,500" },
                { value: "25,000" },
                { value: "60,000" },
                { value: "120,000 per seat, pooled" },
              ],
            },
            {
              label: "CMS writes / month",
              cells: [{ value: "500" }, { value: "5,000" }, { value: "12,000" }, { value: "25,000 per seat, pooled" }],
            },
            {
              label: "Image credits / month",
              cells: [{ value: "25" }, { value: "500" }, { value: "1,500" }, { value: "3,000 per seat, pooled" }],
            },
            {
              label: "How usage is counted",
              cells: [
                { value: "Per user" },
                { value: "Per user" },
                { value: "Per user" },
                { value: "Pooled across workspace" },
              ],
            },
            {
              label: "Invite teammates with roles",
              cells: [
                { value: "Join only", muted: true },
                { value: "Join only", muted: true },
                { value: "Join only", muted: true },
                { value: "Invite up to 500 seats" },
              ],
            },
          ],
          footnote:
            "These are the current default monthly caps. Your billing dashboard always shows the live numbers your account is measured against — if limits are raised, you get the raise automatically.",
        },
        {
          blockType: "faqSection",
          eyebrow: "FAQ",
          heading: "Questions, answered.",
          items: [
            {
              question: "Is Beacon really free?",
              answer:
                "Yes. The Beacon app in the Webflow Designer is free on the Free plan, with starter monthly limits. Paid plans raise limits and add seats — they never unlock hidden features.",
            },
            {
              question: "What counts toward my monthly limits?",
              answer:
                "Webflow updates, CMS writes (including CMS image uploads), and image credits. The exact caps are in the table above, and your billing page always shows how much you've used — no surprises.",
            },
            {
              question: "How does Team seat billing work?",
              answer:
                "You pay per seat with a 6-seat minimum, billed to the workspace. Seats adjust as you invite or remove members, and monthly usage is pooled across everyone.",
            },
            {
              question: "Do my clients need their own paid plan?",
              answer:
                "No. Anyone can join a workspace they're invited to on a free account. In a Team workspace, a seat covers them — they never need a separate subscription.",
            },
            {
              question: "What happens if I hit a limit or cancel?",
              answer:
                "Nothing breaks and nothing is deleted. Hitting a limit pauses new updates until the month resets or you upgrade. Cancelling returns you to Free limits — your sites and work stay exactly as they are.",
            },
          ],
        },
        {
          blockType: "ctaBand",
          heading: "Start free. Upgrade when it earns it.",
          subheading:
            "Install Beacon, connect your site, and ship your first update in minutes — on the plan that costs nothing.",
          actions: [
            { label: "Request early access", href: "/request-access", appearance: "primary" },
            { label: "Sign in", href: "/sign-in", appearance: "secondary" },
          ],
        },
      ],
      seo: {
        title: "Pricing — Codalyn",
        description:
          "Beacon is free on your own site. Tower plans add more workspaces, higher limits, and team seats — one subscription, cancel anytime.",
      },
    },
  });

  payload.logger.info(`Created pricing page ${page.id} (${page.slug}, ${page._status})`);
  process.exit(0);
}

await run();
