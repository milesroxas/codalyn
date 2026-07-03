import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";

const meta = {
  title: "UI/Dialog",
  component: Dialog,
  args: {
    onOpenChange: fn(),
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Trigger-driven dialog with the standard header + footer composition. */
export const Default: Story = {
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger asChild>
        <Button variant="outline">Rename preset</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename preset</DialogTitle>
          <DialogDescription>Give this image preset a name your team will recognize across pages.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={fn()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

/** Rendered open via `defaultOpen` so the surface is visible without clicking. */
export const Open: Story = {
  ...Default,
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, iframeHeight: 400 } } },
};

/** `showCloseButton={false}` on `DialogContent` removes the corner X; dismissal happens through the footer. */
export const WithoutCloseButton: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, iframeHeight: 400 } } },
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger asChild>
        <Button variant="outline">Sync page</Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Sync in progress</DialogTitle>
          <DialogDescription>
            Beacon is pushing 4 composed slots to Webflow. Keep this panel open until the sync finishes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Hide</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

/** `showCloseButton` on `DialogFooter` appends a built-in outline Close button. */
export const FooterCloseButton: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, iframeHeight: 400 } } },
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger asChild>
        <Button variant="outline">View sync report</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync complete</DialogTitle>
          <DialogDescription>12 assets regenerated across 3 pages. No slots were skipped.</DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button onClick={fn()}>View pages</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
