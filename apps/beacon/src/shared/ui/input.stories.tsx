import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Input, InputSearch } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const meta = {
  title: "UI/Input",
  component: Input,
  args: {
    placeholder: "hero-image",
    type: "text",
    disabled: false,
    onChange: fn(),
  },
  argTypes: {
    type: {
      control: "select",
      options: ["text", "number", "email", "url", "password", "search", "file"],
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — flip type/placeholder/disabled from the Controls panel. */
export const Default: Story = {};

export const WithLabel: Story = {
  render: (args) => (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Label htmlFor="slot-name">Slot name</Label>
      <Input {...args} id="slot-name" />
    </div>
  ),
};

export const NumberInput: Story = {
  args: { type: "number", placeholder: "2560", min: 0, step: 20 },
  render: (args) => (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Label htmlFor="max-width">Max width (px)</Label>
      <Input {...args} id="max-width" />
    </div>
  ),
};

/** `aria-invalid` drives the destructive border + ring. */
export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "hero image!" },
  render: (args) => (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Label htmlFor="slot-name-invalid">Slot name</Label>
      <Input {...args} id="slot-name-invalid" />
      <p className="text-xs text-destructive">Slot names can only contain letters, numbers, and dashes.</p>
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "hero-image" },
};

export const FileInput: Story = {
  args: { type: "file", placeholder: undefined },
  render: (args) => (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Label htmlFor="source-image">Source image</Label>
      <Input {...args} id="source-image" />
    </div>
  ),
};

/** `InputSearch` — search field with leading icon and a clear button once text is entered. */
export const Search: Story = {
  args: { type: "search", placeholder: "Search slots" },
  render: (args) => (
    <div className="w-full max-w-xs">
      <InputSearch {...args} />
    </div>
  ),
};

/** `InputSearch` pre-filled so the clear affordance is visible immediately. */
export const SearchWithValue: Story = {
  args: { type: "search", placeholder: "Search slots", defaultValue: "hero" },
  render: (args) => (
    <div className="w-full max-w-xs">
      <InputSearch {...args} />
    </div>
  ),
};
