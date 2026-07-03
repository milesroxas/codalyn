import type { Meta, StoryObj } from "@storybook/react-vite";
import { FieldLabelHint } from "@/shared/ui/field-label-hint";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";

const meta = {
  title: "UI/FieldLabelHint",
  component: FieldLabelHint,
  args: {
    aboutLabel: "Max width",
    children: "Maximum output width in pixels. Larger source images are downscaled on publish.",
  },
  argTypes: {
    children: { control: "text" },
  },
} satisfies Meta<typeof FieldLabelHint>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — hover or focus the help icon to show the tooltip. */
export const Default: Story = {};

/** Intended pairing: sits inline after a field `Label`, above its input. */
export const WithFieldLabel: Story = {
  render: (args) => (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Label htmlFor="max-width">
        Max width (px)
        <FieldLabelHint {...args} />
      </Label>
      <Input id="max-width" type="number" placeholder="2560" min={0} step={20} />
    </div>
  ),
};

/** Also works in setting rows next to a switch label. */
export const WithSwitchRow: Story = {
  args: {
    aboutLabel: "Enable auto-sync",
    children: "Pushes slot changes to the published site automatically after each edit session.",
  },
  render: (args) => (
    <div className="flex w-full max-w-xs items-center justify-between gap-4">
      <Label htmlFor="auto-sync">
        Enable auto-sync
        <FieldLabelHint {...args} />
      </Label>
      <Switch id="auto-sync" defaultChecked />
    </div>
  ),
};
