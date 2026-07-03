import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

const meta = {
  title: "UI/Tooltip",
  component: Tooltip,
  args: {
    onOpenChange: fn(),
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover or focus the trigger — the global TooltipProvider has zero delay. */
export const Default: Story = {
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger asChild>
        <Button variant="outline">Sync page</Button>
      </TooltipTrigger>
      <TooltipContent>Push composed slots to Webflow</TooltipContent>
    </Tooltip>
  ),
};

/** Rendered open via `defaultOpen` so the surface is visible without hovering. */
export const Open: Story = {
  ...Default,
  args: { defaultOpen: true },
};

/** All four placements around real Button triggers. */
export const Placements: Story = {
  render: () => (
    <div className="grid grid-cols-2 place-items-center gap-8 py-10">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Tooltip key={side}>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm">
              {side}
            </Button>
          </TooltipTrigger>
          <TooltipContent side={side}>Synced 2 minutes ago</TooltipContent>
        </Tooltip>
      ))}
    </div>
  ),
};

/** `width="narrow"` caps the content at 10rem so long hints wrap early. */
export const NarrowWidth: Story = {
  args: { defaultOpen: true },
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger asChild>
        <Button variant="outline">Preset info</Button>
      </TooltipTrigger>
      <TooltipContent width="narrow" side="bottom">
        Regenerates every responsive variant for this slot before publish.
      </TooltipContent>
    </Tooltip>
  ),
};
