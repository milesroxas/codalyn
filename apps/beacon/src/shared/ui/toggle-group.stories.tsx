import type { Meta, StoryObj } from "@storybook/react-vite";
import { LayoutGrid, List, Monitor, Smartphone, Tablet } from "lucide-react";
import { fn } from "storybook/test";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

const meta = {
  title: "UI/ToggleGroup",
  component: ToggleGroup,
  args: {
    type: "single",
    defaultValue: "desktop",
    variant: "outline",
    size: "default",
    spacing: 0,
    orientation: "horizontal",
    disabled: false,
    onValueChange: fn(),
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "outline", "segmented"],
    },
    size: {
      control: "select",
      options: ["xs", "sm", "default", "lg"],
    },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
    type: { table: { disable: true } },
  },
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — single-select breakpoint picker; changes log to the Actions panel. */
export const Default: Story = {
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="desktop" aria-label="Desktop">
        <Monitor data-icon="inline-start" aria-hidden />
        Desktop
      </ToggleGroupItem>
      <ToggleGroupItem value="tablet" aria-label="Tablet">
        <Tablet data-icon="inline-start" aria-hidden />
        Tablet
      </ToggleGroupItem>
      <ToggleGroupItem value="mobile" aria-label="Mobile">
        <Smartphone data-icon="inline-start" aria-hidden />
        Mobile
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};

/** `type="multiple"` — pick every format the preset should emit. */
export const Multiple: Story = {
  args: { type: "multiple", defaultValue: ["avif", "webp"] },
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="avif">AVIF</ToggleGroupItem>
      <ToggleGroupItem value="webp">WebP</ToggleGroupItem>
      <ToggleGroupItem value="jpeg">JPEG</ToggleGroupItem>
    </ToggleGroup>
  ),
};

/** Inset segmented control — the active item reads as a raised pill inside the track. */
export const Segmented: Story = {
  args: { variant: "segmented", size: "xs", defaultValue: "grid" },
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="grid" aria-label="Grid view">
        <LayoutGrid data-icon="inline-start" aria-hidden />
        Grid
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label="List view">
        <List data-icon="inline-start" aria-hidden />
        List
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-3">
      {(["xs", "sm", "default", "lg"] as const).map((size) => (
        <ToggleGroup {...args} key={size} size={size}>
          <ToggleGroupItem value="desktop">Desktop</ToggleGroupItem>
          <ToggleGroupItem value="tablet">Tablet</ToggleGroupItem>
          <ToggleGroupItem value="mobile">Mobile</ToggleGroupItem>
        </ToggleGroup>
      ))}
    </div>
  ),
};

/** Non-zero `spacing` keeps each item's own rounded corners instead of a fused bar. */
export const Spaced: Story = {
  args: { variant: "default", spacing: 1.5 },
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="desktop">Desktop</ToggleGroupItem>
      <ToggleGroupItem value="tablet">Tablet</ToggleGroupItem>
      <ToggleGroupItem value="mobile">Mobile</ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <div className="w-40">
      <ToggleGroup {...args}>
        <ToggleGroupItem value="desktop">Desktop</ToggleGroupItem>
        <ToggleGroupItem value="tablet">Tablet</ToggleGroupItem>
        <ToggleGroupItem value="mobile">Mobile</ToggleGroupItem>
      </ToggleGroup>
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="desktop">Desktop</ToggleGroupItem>
      <ToggleGroupItem value="tablet">Tablet</ToggleGroupItem>
      <ToggleGroupItem value="mobile">Mobile</ToggleGroupItem>
    </ToggleGroup>
  ),
};
