import type { Meta, StoryObj } from "@storybook/react-vite";
import { Trash2 } from "lucide-react";
import { fn } from "storybook/test";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFact,
  AlertDialogFactHint,
  AlertDialogFactLabel,
  AlertDialogFactPanel,
  AlertDialogFactValue,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
  alertDialogScrollContentDefaults,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";

const AFFECTED_PAGES = [
  "Home",
  "About",
  "Pricing",
  "Features",
  "Integrations",
  "Customers",
  "Careers",
  "Contact",
  "Blog — CMS template",
  "Blog post — CMS template",
  "Case study — CMS template",
  "Landing — Spring launch",
  "Landing — Webinar",
  "Landing — Partner co-brand",
  "Legal — Privacy",
  "Legal — Terms",
  "404",
  "Style guide",
];

const meta = {
  title: "UI/AlertDialog",
  component: AlertDialog,
  args: {
    onOpenChange: fn(),
  },
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Trigger-driven confirm with cancel + destructive action. */
export const Default: Story = {
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete preset</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete preset?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes “Hero — 2560w” from every page that uses it. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={fn()}>
            Delete preset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/** Rendered open via `defaultOpen` so the surface is visible without clicking. */
export const Open: Story = {
  ...Default,
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, iframeHeight: 400 } } },
};

/** `size="sm"` narrows the content and lays the footer out as a two-column grid. */
export const SmallSize: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, iframeHeight: 400 } } },
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Remove slot</Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove slot?</AlertDialogTitle>
          <AlertDialogDescription>The “Hero image” slot will be removed from this page.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={fn()}>
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/** `AlertDialogMedia` places an icon tile that the header grid wraps around. */
export const WithMedia: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, iframeHeight: 400 } } },
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete collection slots</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete 3 CMS slots?</AlertDialogTitle>
          <AlertDialogDescription>
            Every composed slot bound to the “Landing pages” collection will be removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep slots</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={fn()}>
            Delete slots
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/** The fact panel primitives summarize what the action will touch before confirming. */
export const FactPanel: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, iframeHeight: 450 } } },
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger asChild>
        <Button>Sync assets</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sync 12 assets?</AlertDialogTitle>
          <AlertDialogDescription>
            Beacon will regenerate every preset below before publishing to Webflow.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFactPanel>
          <AlertDialogFact>
            <AlertDialogFactLabel>Assets</AlertDialogFactLabel>
            <AlertDialogFactValue>12</AlertDialogFactValue>
          </AlertDialogFact>
          <AlertDialogFact>
            <AlertDialogFactLabel>Estimated time</AlertDialogFactLabel>
            <AlertDialogFactValue>~40 seconds</AlertDialogFactValue>
          </AlertDialogFact>
          <AlertDialogFactHint>Pages stay live while assets regenerate.</AlertDialogFactHint>
        </AlertDialogFactPanel>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={fn()}>Sync assets</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/** `layout="scroll"` pins header and sticky footer while the middle region scrolls. */
export const ScrollLayout: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, iframeHeight: 500 } } },
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete preset</Button>
      </AlertDialogTrigger>
      <AlertDialogContent {...alertDialogScrollContentDefaults}>
        <AlertDialogHeader>
          <AlertDialogTitle>Review affected pages</AlertDialogTitle>
          <AlertDialogDescription>Deleting this preset touches every page below.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="min-h-0 overflow-y-auto px-4 py-2">
          <div className="flex flex-col gap-2">
            {AFFECTED_PAGES.map((page) => (
              <p key={page} className="text-sm text-muted-foreground">
                {page}
              </p>
            ))}
          </div>
        </div>
        <AlertDialogFooter layout="sticky">
          <AlertDialogAction variant="destructive" onClick={fn()}>
            Delete preset
          </AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
