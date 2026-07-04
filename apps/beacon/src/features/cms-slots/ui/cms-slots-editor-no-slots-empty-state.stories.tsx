import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CmsSlotsEditorNoSlotsEmptyState } from "@/features/cms-slots/ui/cms-slots-editor-no-slots-empty-state";

const meta = {
  title: "CmsSlots/CmsSlotsEditorNoSlotsEmptyState",
  component: CmsSlotsEditorNoSlotsEmptyState,
  args: {
    "data-slot": "cms_slots_editor_no_slots",
    onBack: fn(),
  },
} satisfies Meta<typeof CmsSlotsEditorNoSlotsEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Slot editor opened for a page whose slots were removed — offers a way back. */
export const Default: Story = {};
