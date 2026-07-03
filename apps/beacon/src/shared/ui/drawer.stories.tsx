import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Button } from "@/shared/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerNested,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer";

const SYNC_ASSETS = [
  "Home — Hero image",
  "Home — Feature grid",
  "Home — CTA banner",
  "About — Team photos",
  "About — Office gallery",
  "Pricing — Plan icons",
  "Features — Screenshots",
  "Integrations — Logo wall",
  "Customers — Case study covers",
  "Blog — Post thumbnails",
  "Blog — Author avatars",
  "Landing — Spring hero",
  "Landing — Webinar banner",
  "Landing — Partner logos",
  "Legal — Header image",
  "404 — Illustration",
  "Style guide — Samples",
  "Careers — Culture photos",
];

const meta = {
  title: "UI/Drawer",
  component: Drawer,
  args: {
    onOpenChange: fn(),
  },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Trigger-driven bottom sheet with the standard header / body / footer composition. */
export const Default: Story = {
  render: (args) => (
    <Drawer {...args}>
      <DrawerTrigger asChild>
        <Button variant="outline">Edit slot</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit slot</DrawerTitle>
          <DrawerDescription>Adjust how this CMS slot renders before syncing.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <p className="text-sm text-muted-foreground">Slot: Hero image</p>
          <p className="text-sm text-muted-foreground">Preset: Hero — 2560w</p>
          <p className="text-sm text-muted-foreground">Collection: Landing pages</p>
        </DrawerBody>
        <DrawerFooter>
          <Button size="drawerAction" onClick={fn()}>
            Save changes
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

/** Rendered open via `defaultOpen` so the sheet is visible without clicking. */
export const Open: Story = {
  ...Default,
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, iframeHeight: 500 } } },
};

/** `stickyFooter` pins header and footer while the long asset list scrolls between them. */
export const StickyFooter: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, iframeHeight: 600 } } },
  render: (args) => (
    <Drawer {...args}>
      <DrawerTrigger asChild>
        <Button variant="outline">Review sync plan</Button>
      </DrawerTrigger>
      <DrawerContent stickyFooter maxHeight="tall">
        <DrawerHeader>
          <DrawerTitle>Review sync plan</DrawerTitle>
          <DrawerDescription>18 assets will be regenerated before publish.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          {SYNC_ASSETS.map((asset) => (
            <div key={asset} className="flex items-center justify-between gap-2">
              <span className="text-sm">{asset}</span>
              <span className="text-xs text-muted-foreground">2560w</span>
            </div>
          ))}
        </DrawerBody>
        <DrawerFooter layout="sticky">
          <Button size="drawerAction" onClick={fn()}>
            Sync 18 assets
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

/** `showDragHandle={false}` and `showCloseButton={false}` for a chrome-free sheet. */
export const WithoutHandleOrClose: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, iframeHeight: 400 } } },
  render: (args) => (
    <Drawer {...args}>
      <DrawerTrigger asChild>
        <Button variant="outline">Quick actions</Button>
      </DrawerTrigger>
      <DrawerContent showDragHandle={false} showCloseButton={false}>
        <DrawerHeader>
          <DrawerTitle>Quick actions</DrawerTitle>
          <DrawerDescription>Swipe down or tap the backdrop to dismiss.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button size="drawerAction" onClick={fn()}>
            Scan page for image targets
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

/** `DrawerNested` stacks a second sheet above the first (vaul native nesting). */
export const Nested: Story = {
  render: (args) => (
    <Drawer {...args}>
      <DrawerTrigger asChild>
        <Button variant="outline">Edit slot</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit slot</DrawerTitle>
          <DrawerDescription>Open the nested sheet to swap the image preset.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <DrawerNested onOpenChange={fn()}>
            <DrawerTrigger asChild>
              <Button variant="outline">Choose preset</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Choose preset</DrawerTitle>
                <DrawerDescription>Presets available for this slot.</DrawerDescription>
              </DrawerHeader>
              <DrawerBody>
                <p className="text-sm text-muted-foreground">Hero — 2560w</p>
                <p className="text-sm text-muted-foreground">Card — 1280w</p>
                <p className="text-sm text-muted-foreground">Thumb — 640w</p>
              </DrawerBody>
            </DrawerContent>
          </DrawerNested>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  ),
};
