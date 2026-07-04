import type { Meta, StoryObj } from "@storybook/react-vite";
import { CmsSlotsComposerInstallInDesignerEmptyState } from "@/features/cms-slots/ui/cms-slots-composer-install-in-designer-empty-state";

const meta = {
  title: "CmsSlots/CmsSlotsComposerInstallInDesignerEmptyState",
  component: CmsSlotsComposerInstallInDesignerEmptyState,
  args: {
    "data-slot": "cms_slots_composer_install",
  },
} satisfies Meta<typeof CmsSlotsComposerInstallInDesignerEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Composer route gate: the wrapper must be installed from the Designer tab first. */
export const Default: Story = {};
