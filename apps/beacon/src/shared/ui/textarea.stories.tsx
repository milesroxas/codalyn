import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  args: {
    placeholder: "Describe this image for screen readers",
    disabled: false,
    onChange: fn(),
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — the field auto-grows with content (`field-sizing-content`). */
export const Default: Story = {};

export const WithLabel: Story = {
  render: (args) => (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Label htmlFor="alt-text">Alt text</Label>
      <Textarea {...args} id="alt-text" />
      <p className="text-xs text-muted-foreground">Written to the asset on the next sync.</p>
    </div>
  ),
};

/** `aria-invalid` drives the destructive border + ring. */
export const Invalid: Story = {
  args: { "aria-invalid": true },
  render: (args) => (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Label htmlFor="alt-text-invalid">Alt text</Label>
      <Textarea {...args} id="alt-text-invalid" />
      <p className="text-xs text-destructive">Alt text is required before this slot can publish.</p>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: "Team photo from the 2025 summit, taken on the rooftop terrace.",
  },
};

export const WithValue: Story = {
  args: {
    defaultValue:
      "Aerial view of the campus at dusk. Warm light in the atrium windows, walking paths lit along the north lawn.",
  },
};
