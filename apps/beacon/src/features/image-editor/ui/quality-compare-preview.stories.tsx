import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { QualityComparePreview } from "@/features/image-editor/ui/quality-compare-preview";

const meta = {
  title: "ImageEditor/QualityComparePreview",
  component: QualityComparePreview,
  decorators: [
    (Story) => (
      <div className="max-w-xs p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    originalSrc: "/beacon-thumb.jpg",
    compressedSrc: "/images/dark-tile-image-upload.webp",
    pending: false,
    exportWidth: 1600,
    exportHeight: 900,
    onOpenQualityPopout: fn(),
  },
} satisfies Meta<typeof QualityComparePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Ready state with the wipe handle and the "Pop out" button (popout flag on). */
export const Default: Story = {};

/**
 * The quality-compare popout is flag-gated (`VITE_QUALITY_COMPARE_POPOUT_ENABLED`); when off the
 * opener callback is absent and the "Pop out" button is not rendered at all — Marketplace bars
 * dead/disabled placeholder UI.
 */
export const PopoutDisabled: Story = {
  args: { onOpenQualityPopout: undefined },
};

/** Encoding in flight: deferred spinner over the stage, button disabled while not ready. */
export const Pending: Story = {
  args: { compressedSrc: null, pending: true },
};
