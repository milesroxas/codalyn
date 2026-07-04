import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Area } from "react-easy-crop";
import { ExportEncodeSizeFootnote, ExportPresetLimitBar } from "@/features/image-editor/ui/export-size-estimate";

const KB = 1024;
const MB = 1024 * KB;

/** A committed 16:9 hero crop from a 2560×1440 source. */
const HERO_CROP: Area = { x: 0, y: 120, width: 2560, height: 1440 };

const meta = {
  title: "ImageEditor/ExportSizeEstimate",
  component: ExportEncodeSizeFootnote,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    originalBytes: Math.round(4.2 * MB),
    estimatedBytes: 312 * KB,
    estimatePending: false,
    completedCrop: HERO_CROP,
    showQualityCommitHint: false,
  },
} satisfies Meta<typeof ExportEncodeSizeFootnote>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A 4.2 MB hero photo encoding down to ~312 KB — the info tooltip carries the savings delta. */
export const EstimateReady: Story = {};

/**
 * Re-encoding after a quality change. The spinner is deferred
 * (`useDeferredLoadingIndicator`), so it appears after a short delay.
 */
export const EstimatePending: Story = {
  args: { estimatePending: true, estimatedBytes: null },
};

/** No committed crop yet — the estimate column asks for a crop first. */
export const CropRequired: Story = {
  args: { completedCrop: null, estimatedBytes: null },
};

/** Segmented meter vs. a 350 KB preset limit — tone shifts as usage climbs past 70/90/100%. */
export const PresetLimitBar: Story = {
  render: () => {
    const presetMaxBytes = 350 * KB;
    const samples: ReadonlyArray<[label: string, estimatedBytes: number]> = [
      ["120 KB — safe", 120 * KB],
      ["260 KB — approaching", 260 * KB],
      ["330 KB — near limit", 330 * KB],
      ["390 KB — over limit", 390 * KB],
    ];
    return (
      <div className="flex flex-col gap-4">
        {samples.map(([label, estimatedBytes]) => (
          <div key={label} className="flex flex-col gap-1.5">
            <p className="text-muted-foreground text-xs">{label}</p>
            <ExportPresetLimitBar estimatedBytes={estimatedBytes} maxBytes={presetMaxBytes} />
          </div>
        ))}
      </div>
    );
  },
};
