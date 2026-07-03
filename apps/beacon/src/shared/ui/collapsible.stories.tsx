import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronsUpDown } from "lucide-react";
import { fn } from "storybook/test";
import { Button } from "@/shared/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";

const meta = {
  title: "UI/Collapsible",
  component: Collapsible,
  args: {
    onOpenChange: fn(),
  },
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One row stays visible; expanding reveals the rest of the pages using this preset. */
export const Default: Story = {
  render: (args) => (
    <div className="w-full max-w-xs">
      <Collapsible {...args}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Pages using this preset</p>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Toggle page list">
              <ChevronsUpDown />
            </Button>
          </CollapsibleTrigger>
        </div>
        <div className="flex flex-col gap-1 pt-1">
          <p className="text-sm text-muted-foreground">Home</p>
          <CollapsibleContent>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">About</p>
              <p className="text-sm text-muted-foreground">Pricing</p>
              <p className="text-sm text-muted-foreground">Blog — CMS template</p>
              <p className="text-sm text-muted-foreground">Landing — Spring launch</p>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  ),
};

/** Expanded on mount via `defaultOpen`. */
export const DefaultOpen: Story = {
  ...Default,
  args: { defaultOpen: true },
};

/** `disabled` keeps the trigger visible but inert. */
export const Disabled: Story = {
  ...Default,
  args: { disabled: true },
};
