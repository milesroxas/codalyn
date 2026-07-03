import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Button } from "@/shared/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/shared/ui/popover";

const meta = {
  title: "UI/Popover",
  component: Popover,
  args: {
    onOpenChange: fn(),
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Trigger-driven popover with the header composition. */
export const Default: Story = {
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger asChild>
        <Button variant="outline">Preset details</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Hero — 2560w</PopoverTitle>
          <PopoverDescription>Applied to 4 pages. Last synced 2 minutes ago.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};

/** Rendered open via `defaultOpen` so the surface is visible without clicking. */
export const Open: Story = {
  ...Default,
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, iframeHeight: 300 } } },
};

/** Header plus an action row, aligned to the trigger's start edge. */
export const WithActions: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, iframeHeight: 350 } } },
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger asChild>
        <Button variant="outline">Slot status</Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom">
        <PopoverHeader>
          <PopoverTitle>Hero image slot</PopoverTitle>
          <PopoverDescription>Out of sync — the CMS item changed after the last publish.</PopoverDescription>
        </PopoverHeader>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={fn()}>
            Dismiss
          </Button>
          <Button size="sm" onClick={fn()}>
            Sync now
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
