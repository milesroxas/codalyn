import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScrollArea } from "@/shared/ui/scroll-area";

const SITE_PAGES = [
  { name: "Home", slots: "4 slots" },
  { name: "About", slots: "2 slots" },
  { name: "Pricing", slots: "3 slots" },
  { name: "Features", slots: "5 slots" },
  { name: "Integrations", slots: "2 slots" },
  { name: "Customers", slots: "4 slots" },
  { name: "Careers", slots: "1 slot" },
  { name: "Contact", slots: "1 slot" },
  { name: "Blog — CMS template", slots: "6 slots" },
  { name: "Blog post — CMS template", slots: "3 slots" },
  { name: "Case study — CMS template", slots: "4 slots" },
  { name: "Landing — Spring launch", slots: "5 slots" },
  { name: "Landing — Webinar", slots: "3 slots" },
  { name: "Landing — Partner co-brand", slots: "4 slots" },
  { name: "Legal — Privacy", slots: "0 slots" },
  { name: "Legal — Terms", slots: "0 slots" },
  { name: "404", slots: "1 slot" },
  { name: "Style guide", slots: "2 slots" },
];

const meta = {
  title: "UI/ScrollArea",
  component: ScrollArea,
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Height-constrained page list — scroll to reveal the themed vertical scrollbar. */
export const Default: Story = {
  render: () => (
    <ScrollArea className="h-64 w-full">
      <div className="flex flex-col gap-1">
        {SITE_PAGES.map((page) => (
          <div key={page.name} className="flex items-center justify-between gap-2 py-1.5">
            <span className="text-sm">{page.name}</span>
            <span className="text-xs text-muted-foreground">{page.slots}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

/** Long prose in a shorter viewport at the 350px panel width. */
export const LongText: Story = {
  render: () => (
    <ScrollArea className="h-48 w-full">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">How syncing works</p>
        <p className="text-sm text-muted-foreground">
          Beacon reads every composed slot on the selected page and compares it against the last published state of the
          connected Webflow site.
        </p>
        <p className="text-sm text-muted-foreground">
          Assets whose CMS item changed since the last publish are marked out of sync. Presets attached to those slots
          are regenerated at every configured width before anything is uploaded.
        </p>
        <p className="text-sm text-muted-foreground">
          Uploads are batched per page so a failed asset never blocks the rest of the sync. If an upload fails, Beacon
          keeps the previous published asset in place and reports the failure in the sync log.
        </p>
        <p className="text-sm text-muted-foreground">
          Once every asset lands, Beacon rewrites the slot bindings and triggers a site publish. Pages stay live for
          visitors during the entire process.
        </p>
        <p className="text-sm text-muted-foreground">
          You can re-run a sync at any time; unchanged assets are skipped automatically so repeat syncs finish in
          seconds.
        </p>
      </div>
    </ScrollArea>
  ),
};
