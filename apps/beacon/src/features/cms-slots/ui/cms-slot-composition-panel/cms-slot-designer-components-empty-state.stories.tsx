import type { Meta, StoryObj } from "@storybook/react-vite";
import { CmsSlotDesignerComponentsEmptyState } from "@/features/cms-slots/ui/cms-slot-composition-panel/cms-slot-designer-components-empty-state";

const meta = {
  title: "CmsSlots/CmsSlotDesignerComponentsEmptyState",
  component: CmsSlotDesignerComponentsEmptyState,
} satisfies Meta<typeof CmsSlotDesignerComponentsEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Composition panel before any Designer components exist inside the slot. */
export const Default: Story = {};
