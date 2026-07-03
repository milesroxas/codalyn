import type { Meta, StoryObj } from "@storybook/react-vite";
import { Check, Image as ImageIcon, TriangleAlert } from "lucide-react";
import { Badge } from "@/shared/ui/badge";

const VARIANTS = ["default", "secondary", "accent", "destructive", "outline", "ghost", "link"] as const;

const meta = {
  title: "UI/Badge",
  component: Badge,
  args: {
    children: "Image",
    variant: "default",
    size: "default",
  },
  argTypes: {
    variant: { control: "select", options: [...VARIANTS] },
    size: { control: "select", options: ["default", "sm"] },
    asChild: { table: { disable: true } },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — flip variant/size from the Controls panel. */
export const Default: Story = {};

/** All seven variants at the default size. */
export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      {VARIANTS.map((variant) => (
        <Badge key={variant} {...args} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
};

/** Default vs `sm` — `sm` is the density used on prop-type chips in select rows. */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {VARIANTS.map((variant) => (
          <Badge key={variant} {...args} variant={variant} size="default">
            Plain text
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {VARIANTS.map((variant) => (
          <Badge key={variant} {...args} variant={variant} size="sm">
            Plain text
          </Badge>
        ))}
      </div>
    </div>
  ),
};

/** Icons auto-size; `data-icon` tightens the padding on the icon side. */
export const WithIcon: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="accent">
        <ImageIcon data-icon="inline-start" aria-hidden />
        Image
      </Badge>
      <Badge variant="secondary">
        Synced
        <Check data-icon="inline-end" aria-hidden />
      </Badge>
      <Badge variant="destructive" size="sm">
        <TriangleAlert data-icon="inline-start" aria-hidden />3 skipped
      </Badge>
    </div>
  ),
};

/** Prop value-type chips as used in the Designer expose-props rows. */
export const ValueTypeChips: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      {["Plain text", "Rich text", "Image", "Link", "Number"].map((valueType) => (
        <Badge key={valueType} variant="accent" size="sm">
          {valueType}
        </Badge>
      ))}
    </div>
  ),
};
