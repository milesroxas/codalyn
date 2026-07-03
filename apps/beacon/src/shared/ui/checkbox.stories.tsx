import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  args: {
    defaultChecked: false,
    disabled: false,
    onCheckedChange: fn(),
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — uncontrolled; click to toggle, watch the Actions panel. */
export const Default: Story = {};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const WithLabel: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox {...args} id="auto-sync" />
      <Label htmlFor="auto-sync">Enable auto-sync</Label>
    </div>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Checkbox {...args} id="disabled-unchecked" disabled />
        <Label htmlFor="disabled-unchecked">Optimize on publish</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox {...args} id="disabled-checked" disabled defaultChecked />
        <Label htmlFor="disabled-checked">Strip EXIF metadata</Label>
      </div>
    </div>
  ),
};

/** `aria-invalid` drives the destructive border + ring (e.g. a required consent box). */
export const Invalid: Story = {
  args: { "aria-invalid": true },
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox {...args} id="confirm-overwrite" />
      <Label htmlFor="confirm-overwrite">I understand this overwrites the live asset</Label>
    </div>
  ),
};
