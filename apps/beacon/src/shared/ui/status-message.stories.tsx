import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Button } from "@/shared/ui/button";
import { StatusMessage } from "@/shared/ui/status-message";

const TONES = ["muted", "warning", "danger"] as const;

const meta = {
  title: "UI/StatusMessage",
  component: StatusMessage,
  args: {
    children: "Changes saved to this slot.",
    layout: "block",
    tone: "muted",
    size: "default",
    pending: false,
  },
  argTypes: {
    layout: { control: "select", options: ["block", "inline"] },
    tone: { control: "select", options: [...TONES] },
    size: { control: "select", options: ["sm", "default"] },
  },
} satisfies Meta<typeof StatusMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — flip layout/tone/size and toggle pending from the Controls panel. */
export const Default: Story = {};

/** The three tones: neutral status, recoverable warning, and blocking error. */
export const Tones: Story = {
  render: (args) => (
    <div className="flex flex-col gap-2">
      <StatusMessage {...args} tone="muted">
        Changes saved to this slot.
      </StatusMessage>
      <StatusMessage {...args} tone="warning">
        Set the export size for this image before saving.
      </StatusMessage>
      <StatusMessage {...args} tone="danger">
        Sync failed — Webflow rejected 3 CMS writes.
      </StatusMessage>
    </div>
  ),
};

/** `sm` vs default — `sm` pairs with compact rows and drawer footers. */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-2">
      <StatusMessage {...args} size="sm">
        14 items synced, 2 skipped.
      </StatusMessage>
      <StatusMessage {...args} size="default">
        14 items synced, 2 skipped.
      </StatusMessage>
    </div>
  ),
};

/** Pending forces the inline layout and prepends a spinner. */
export const Pending: Story = {
  args: { pending: true, children: "Publishing slot…" },
};

/** Inline layout beside an action — a typical drawer-footer save row. */
export const InlineWithAction: Story = {
  args: { layout: "inline", size: "sm", children: "Unsaved changes" },
  render: (args) => (
    <div className="flex items-center justify-between gap-3">
      <StatusMessage {...args} />
      <Button type="button" size="sm" onClick={fn()}>
        Save changes
      </Button>
    </div>
  ),
};
