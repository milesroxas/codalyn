import type { Meta, StoryObj } from "@storybook/react-vite";
import { Inbox, Plus } from "lucide-react";
import { fn } from "storybook/test";
import { CmsSlotsPanelEmptyState } from "@/features/cms-slots/ui/cms-slots-panel-empty-state";
import { EmptyAction } from "@/shared/ui/empty";

const meta = {
  title: "CmsSlots/CmsSlotsPanelEmptyState",
  component: CmsSlotsPanelEmptyState,
  args: {
    "data-slot": "cms_slots_panel_empty",
    icon: Inbox,
    title: "No slots yet",
    description: "Slots installed on this collection template will show up here.",
  },
  argTypes: {
    icon: { table: { disable: true } },
    footer: { table: { disable: true } },
  },
} satisfies Meta<typeof CmsSlotsPanelEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Inset-panel empty state used inside route panels and drawers. */
export const Default: Story = {};

/** `footer` slots an action row, e.g. creating the first slot list. */
export const WithAction: Story = {
  args: {
    title: "No slot lists on this page",
    description: "Add a slot list to the Blog Post template to start placing CMS-driven sections.",
    footer: (
      <EmptyAction onClick={fn()}>
        <Plus data-icon="inline-start" aria-hidden strokeWidth={1.75} />
        <span>Add your first slot</span>
      </EmptyAction>
    ),
  },
};
