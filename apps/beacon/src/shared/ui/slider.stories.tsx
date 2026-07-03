import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Label } from "@/shared/ui/label";
import { Slider } from "@/shared/ui/slider";

const meta = {
  title: "UI/Slider",
  component: Slider,
  args: {
    defaultValue: [80],
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
    onValueChange: fn(),
    onValueCommit: fn(),
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — single-thumb quality slider; drags log to the Actions panel. */
export const Default: Story = {};

export const WithLabel: Story = {
  render: (args) => (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="quality">Compression quality</Label>
        <span className="font-mono text-xs text-muted-foreground">80%</span>
      </div>
      <Slider {...args} id="quality" aria-label="Compression quality" />
    </div>
  ),
};

/** Two values render two thumbs — a min/max output-width range. */
export const Range: Story = {
  args: {
    defaultValue: [640, 2560],
    min: 320,
    max: 3840,
    step: 20,
  },
  render: (args) => (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label>Output width (px)</Label>
        <span className="font-mono text-xs text-muted-foreground">640–2560</span>
      </div>
      <Slider {...args} aria-label="Output width range" />
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: [60] },
};

/** `orientation="vertical"` — the track grows to fill its container height. */
export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <div className="flex h-48 items-stretch gap-6">
      <Slider {...args} aria-label="Compression quality" />
      <Slider {...args} defaultValue={[640, 2560]} min={320} max={3840} step={20} aria-label="Output width range" />
    </div>
  ),
};
