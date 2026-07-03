import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";

const meta = {
  title: "UI/Switch",
  component: Switch,
  args: {
    size: "default",
    defaultChecked: true,
    disabled: false,
    onCheckedChange: fn(),
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "default"],
    },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — uncontrolled; click to toggle, watch the Actions panel. */
export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-4">
      <Switch {...args} size="sm" aria-label="Enable auto-sync (small)" />
      <Switch {...args} size="default" aria-label="Enable auto-sync (default)" />
    </div>
  ),
};

export const WithLabel: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Switch {...args} id="auto-sync" />
      <Label htmlFor="auto-sync">Enable auto-sync</Label>
    </div>
  ),
};

/** Setting row with a description, as used in Beacon preset settings. */
export const SettingRow: Story = {
  render: (args) => (
    <div className="flex w-full max-w-xs items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="optimize-on-publish">Optimize on publish</Label>
        <p className="text-xs text-muted-foreground">Re-encode slot images with the active preset on every publish.</p>
      </div>
      <Switch {...args} id="optimize-on-publish" />
    </div>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Switch {...args} id="disabled-off" disabled defaultChecked={false} />
        <Label htmlFor="disabled-off">Enable auto-sync</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch {...args} id="disabled-on" disabled defaultChecked />
        <Label htmlFor="disabled-on">Strip EXIF metadata</Label>
      </div>
    </div>
  ),
};
