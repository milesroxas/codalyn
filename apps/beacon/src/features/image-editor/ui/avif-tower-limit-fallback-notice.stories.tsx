import type { Meta, StoryObj } from "@storybook/react-vite";
import { AvifTowerLimitFallbackNotice } from "@/features/image-editor/ui/avif-tower-limit-fallback-notice";

const meta = {
  title: "ImageEditor/AvifTowerLimitFallbackNotice",
  component: AvifTowerLimitFallbackNotice,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AvifTowerLimitFallbackNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shown in the export flow when Tower image credits are exhausted — AVIF presets fall back to WebP. */
export const Default: Story = {};
