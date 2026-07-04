import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ImageEditorComponentPlacementConsentDialog } from "@/features/image-editor/ui/image-editor-component-placement-consent-dialog";

const meta = {
  title: "ImageEditor/ImageEditorComponentPlacementConsentDialog",
  component: ImageEditorComponentPlacementConsentDialog,
  args: {
    searching: null,
    request: { componentName: "Hero Banner", pageId: "page-home", scanFoundNothing: false },
    currentPageId: "page-home",
    scanPending: false,
    onConfirmPlacement: fn(),
    onScanPage: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ImageEditorComponentPlacementConsentDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Consent gate: the component isn't on this page, Beacon asks before placing a temporary copy. */
export const AddConsent: Story = {};

/** Initial searching state while Beacon scans the current page for the preset's component. */
export const ScanningPage: Story = {
  args: { request: null, searching: { placing: false } },
};

/** The Designer moved to another page mid-flow — offer to scan there instead of adding a copy. */
export const PageChangedScanOffer: Story = {
  args: { currentPageId: "page-pricing" },
};

/** A scan on this page came up empty — the add-consent view leads with the miss. */
export const ScanFoundNothing: Story = {
  args: {
    request: { componentName: "Hero Banner", pageId: "page-home", scanFoundNothing: true },
  },
};
