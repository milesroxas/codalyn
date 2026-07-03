import type { Meta, StoryObj } from "@storybook/react-vite";
import type { VariantProps } from "class-variance-authority";
import { Filter } from "lucide-react";
import { Toggle as TogglePrimitive } from "radix-ui";
import type * as React from "react";
import { fn } from "storybook/test";
import { toggleVariants } from "@/shared/ui/toggle";

type ToggleProps = React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>;

/**
 * `toggle.tsx` exports only the `toggleVariants` cva (its consumer is `ToggleGroupItem`).
 * This story-local wrapper binds those variants to the Radix Toggle primitive so every
 * variant/size axis can be exercised standalone.
 */
function Toggle({ variant, size, ...props }: ToggleProps) {
  return <TogglePrimitive.Root {...props} data-slot="toggle" className={toggleVariants({ variant, size })} />;
}

const meta = {
  title: "UI/Toggle",
  component: Toggle,
  args: {
    children: "Optimized only",
    variant: "default",
    size: "default",
    defaultPressed: false,
    disabled: false,
    onPressedChange: fn(),
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
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — uncontrolled pressed state; toggles log to the Actions panel. */
export const Default: Story = {};

/** `segmented` is designed to sit inside a `ToggleGroup` track — see UI/ToggleGroup. */
export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {(["default", "outline", "segmented"] as const).map((variant) => (
        <Toggle key={variant} {...args} variant={variant}>
          {variant}
        </Toggle>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  args: { variant: "outline" },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {(["xs", "sm", "default", "lg"] as const).map((size) => (
        <Toggle key={size} {...args} size={size}>
          {size}
        </Toggle>
      ))}
    </div>
  ),
};

export const WithIcon: Story = {
  args: { variant: "outline" },
  render: (args) => (
    <Toggle {...args}>
      <Filter data-icon="inline-start" aria-hidden />
      Optimized only
    </Toggle>
  ),
};

export const Pressed: Story = {
  args: { defaultPressed: true, variant: "outline" },
};

export const Disabled: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Toggle {...args} variant="outline" disabled>
        Optimized only
      </Toggle>
      <Toggle {...args} variant="outline" disabled defaultPressed>
        Synced only
      </Toggle>
    </div>
  ),
};
