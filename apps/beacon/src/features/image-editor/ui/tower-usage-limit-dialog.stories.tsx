import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { TowerUsageLimitDialog } from "@/features/image-editor/ui/tower-usage-limit-dialog";

const meta = {
  title: "ImageEditor/TowerUsageLimitDialog",
  component: TowerUsageLimitDialog,
  args: {
    open: true,
    details: { kind: "image", used: 500, limit: 500, usageScope: "user" },
    onOpenChange: fn(),
  },
} satisfies Meta<typeof TowerUsageLimitDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Personal image-optimization credits used up — includes the WebP fallback hint. */
export const ImageCreditsExhausted: Story = {};

/** The breached meter is the workspace's pooled Team allowance, not a personal one. */
export const WorkspacePooledLimit: Story = {
  args: {
    details: { kind: "image", used: 2000, limit: 2000, usageScope: "workspace" },
  },
};

/** A non-image meter (CMS layout saves) — generic title, no WebP hint. */
export const CmsSaveLimit: Story = {
  args: {
    details: { kind: "cmsWrite", used: 150, limit: 150, usageScope: "user" },
  },
};
