import type { Meta, StoryObj } from "@storybook/react-vite";
import { Separator } from "@/shared/ui/separator";

const meta = {
  title: "UI/Separator",
  component: Separator,
  args: {
    orientation: "horizontal",
    decorative: true,
  },
  argTypes: {
    orientation: { control: "select", options: ["horizontal", "vertical"] },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Horizontal rule between stacked content blocks. */
export const Default: Story = {
  render: (args) => (
    <div className="flex w-64 flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Image presets</p>
        <p className="text-xs text-muted-foreground">Reusable export sizes for this site.</p>
      </div>
      <Separator {...args} />
      <p className="text-xs text-muted-foreground">3 presets · last edited 2 minutes ago</p>
    </div>
  ),
};

/** Vertical dividers between inline route labels. */
export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <div className="flex h-5 items-center gap-3">
      <span className="text-sm">Designer</span>
      <Separator {...args} />
      <span className="text-sm">Composer</span>
      <Separator {...args} />
      <span className="text-sm">Sync</span>
    </div>
  ),
};
