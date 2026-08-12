import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { QualityComparePopoutPage } from "@/features/image-editor/ui/quality-compare-popout-page";

const meta = {
  title: "ImageEditor/QualityComparePopoutPage",
  component: QualityComparePopoutPage,
  parameters: { layout: "fullscreen" },
  decorators: [
    // The popout window ships its own stylesheet instead of the extension's Tailwind bundle; load
    // it from the static dir. All rules are scoped under .qc-page / body.qc-body, so the sheet is
    // inert for other stories even though React keeps precedence stylesheets mounted.
    (Story) => (
      <>
        <link rel="stylesheet" href="/quality-compare.css" precedence="default" />
        <Story />
      </>
    ),
  ],
  args: {
    quality: 0.8,
    originalSrc: "/beacon-thumb.jpg",
    compressedSrc: "/images/dark-tile-image-upload.webp",
    aspectRatio: 16 / 9,
    encodeError: false,
    onQualityInput: fn(),
    onQualityCommit: fn(),
    onSaveClose: fn(),
  },
} satisfies Meta<typeof QualityComparePopoutPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The popout as it renders after `init`: slider, save action, and the compare stage. */
export const Default: Story = {};

/** Encode failure surfaced by the opener (`compressed-error`): inline alert under the toolbar. */
export const EncodeError: Story = {
  args: { encodeError: true },
};

/** Before `init` arrives no images are mounted — the stage renders empty at the default ratio. */
export const AwaitingInit: Story = {
  args: { originalSrc: null, compressedSrc: null, aspectRatio: 1 },
};
