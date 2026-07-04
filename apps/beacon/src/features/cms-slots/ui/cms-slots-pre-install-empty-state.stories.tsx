import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CmsSlotsPreInstallEmptyState } from "@/features/cms-slots/ui/cms-slots-pre-install-empty-state";

const meta = {
  title: "CmsSlots/CmsSlotsPreInstallEmptyState",
  component: CmsSlotsPreInstallEmptyState,
  args: {
    "data-slot": "cms_slots_pre_install",
    installPending: false,
    pageScanLoading: false,
    onInstallWrapper: fn(),
  },
} satisfies Meta<typeof CmsSlotsPreInstallEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shown on a collection template before the slot wrapper is installed. */
export const Default: Story = {};

/** Install in flight — the action swaps to a spinner and disables itself. */
export const InstallPending: Story = {
  args: { installPending: true },
};

/** Page scan still running — install stays disabled until the scan settles. */
export const PageScanLoading: Story = {
  args: { pageScanLoading: true },
};
