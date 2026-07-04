import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  ImageEditorConfigurationPresetsListView,
  type PresetListRow,
} from "@/features/image-editor/ui/image-editor-preset-list-view";

const KB = 1024;

const heroPreset: PresetListRow = {
  id: "preset-hero",
  name: "hero",
  displayName: "Hero",
  scope: "element",
  width: 2560,
  height: 1440,
  exportFormat: "avif",
  maxFileSizeBytes: 350 * KB,
};

const logoPreset: PresetListRow = {
  id: "preset-logo",
  name: "logo",
  displayName: "Logo",
  scope: "component",
  width: 480,
  height: 480,
  exportFormat: "webp",
  maxFileSizeBytes: 80 * KB,
};

const cardThumbnailPreset: PresetListRow = {
  id: "preset-card-thumbnail",
  name: "card-thumbnail",
  displayName: "Card thumbnail",
  scope: "instance",
  width: 1200,
  height: 800,
  maxFileSizeBytes: 200 * KB,
};

const siteDefaultPreset: PresetListRow = {
  id: "preset-site-default",
  name: "site-default",
  displayName: "Site default",
  scope: "site-default",
  width: 1920,
  height: 1080,
  exportFormat: "webp",
  maxFileSizeBytes: 500 * KB,
};

const meta = {
  title: "ImageEditor/ImageEditorConfigurationPresetsListView",
  component: ImageEditorConfigurationPresetsListView,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    isGuest: false,
    presetRows: [heroPreset, logoPreset, cardThumbnailPreset, siteDefaultPreset],
    openEdit: fn(),
    onOpenAdd: fn(),
    onRequestDelete: fn(),
  },
} satisfies Meta<typeof ImageEditorConfigurationPresetsListView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Export presets split from the site-default preset, with the add-preset action on top. */
export const Populated: Story = {};

/** No presets yet — only the add-preset action renders. */
export const Empty: Story = {
  args: { presetRows: [] },
};

/** Guest mode: explanatory copy, and every tile plus the add action is disabled. */
export const GuestReadOnly: Story = {
  args: { isGuest: true },
};
