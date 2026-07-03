import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const meta = {
  title: "UI/Label",
  component: Label,
  args: {
    children: "Slot name",
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — bare label text. */
export const Default: Story = {};

export const WithInput: Story = {
  render: (args) => (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Label {...args} htmlFor="slot-name" />
      <Input id="slot-name" placeholder="hero-image" />
    </div>
  ),
};

/** The label dims automatically when its `peer` control is disabled. */
export const WithDisabledControl: Story = {
  args: { children: "Enable auto-sync" },
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox id="auto-sync-disabled" disabled />
      <Label {...args} htmlFor="auto-sync-disabled" />
    </div>
  ),
};

/** Labels are flex containers, so trailing metadata can sit inline. */
export const WithInlineMeta: Story = {
  args: { children: "Output format" },
  render: (args) => (
    <Label {...args}>
      {args.children}
      <span className="font-normal text-muted-foreground">(optional)</span>
    </Label>
  ),
};
