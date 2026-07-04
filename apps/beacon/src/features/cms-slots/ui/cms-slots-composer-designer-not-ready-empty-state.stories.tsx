import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CmsSlotsComposerDesignerNotReadyEmptyState } from "@/features/cms-slots/ui/cms-slots-composer-designer-not-ready-empty-state";

const meta = {
  title: "CmsSlots/CmsSlotsComposerDesignerNotReadyEmptyState",
  component: CmsSlotsComposerDesignerNotReadyEmptyState,
  args: {
    "data-slot": "cms_slots_composer_not_ready",
    onBack: fn(),
  },
} satisfies Meta<typeof CmsSlotsComposerDesignerNotReadyEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Composer opened before the Designer setup finished — offers a way back. */
export const Default: Story = {};
