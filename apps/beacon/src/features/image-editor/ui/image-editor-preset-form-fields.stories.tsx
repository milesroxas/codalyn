import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { ExportConstraintsFields, PresetFormStep2 } from "@/features/image-editor/ui/image-editor-preset-form-fields";

const KB = 1024;

/** The form only reads label/kind/prop label — the Designer element is never touched. */
const heroSurfaceTarget: ImagePageTarget = {
  id: "comp-0",
  kind: "component",
  element: {} as unknown as AnyElement,
  label: "Hero Banner",
  imagePropId: "prop-hero-background",
  imagePropLabel: "Background image",
};

const meta = {
  title: "ImageEditor/PresetFormFields",
  component: PresetFormStep2,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    baseId: "preset-form",
    savePending: false,
    presetScope: "element",
    surfaceTarget: heroSurfaceTarget,
    surfaceDiscoveryPending: false,
    nameDraft: "Hero",
    setNameDraft: fn(),
    wStr: "2560",
    setWStr: fn(),
    hStr: "1440",
    setHStr: fn(),
    maxSizeStr: "350",
    setMaxSizeStr: fn(),
    maxSizeUnit: "kb",
    setMaxSizeUnit: fn(),
    formatEnabled: true,
    setFormatEnabled: fn(),
    formatDraft: "avif",
    setFormatDraft: fn(),
  },
} satisfies Meta<typeof PresetFormStep2>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Editing a 2560×1440 AVIF hero preset scoped to a component image field. */
export const Step2ElementScope: Story = {};

/** The site-default preset hides the surface summary — dimensions and encoding only. */
export const SiteDefaultScope: Story = {
  args: {
    presetScope: "site-default",
    surfaceTarget: null,
    nameDraft: "Site default",
    wStr: "1920",
    hStr: "1080",
    formatDraft: "webp",
  },
};

/** All inputs lock while the preset save is in flight. */
export const SavePending: Story = {
  args: { savePending: true },
};

/**
 * `ExportConstraintsFields` — the self-contained constraints editor shared with the CMS slot
 * Designer panel. It manages its own drafts, so the inputs are live in the canvas.
 */
export const ExportConstraintsEditor: Story = {
  render: () => (
    <ExportConstraintsFields
      baseId="cms-slot-constraints"
      defaultQuality={80}
      value={{
        width: 2560,
        height: 1440,
        exportFormat: "avif",
        maxFileSizeBytes: 350 * KB,
        quality: 80,
      }}
      onChange={fn()}
    />
  ),
};
