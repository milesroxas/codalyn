import { formatBeaconPresetDimensionsLabel } from "@codalyn/webflow-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { PresetListTile } from "@/features/image-editor/ui/preset-list-tile";

const meta = {
  title: "ImageEditor/PresetListTile",
  component: PresetListTile,
  decorators: [
    // Mirrors the real preset list markup: tiles live in a two-column grid <ul>.
    (Story) => (
      <ul className="m-0 grid w-80 list-none grid-cols-2 gap-3 p-0">
        <Story />
      </ul>
    ),
  ],
  args: {
    displayName: "Hero",
    dimensionsLabel: formatBeaconPresetDimensionsLabel({ width: 2560, height: 1440 }),
    disabled: false,
    onOpen: fn(),
    onRequestDelete: fn(),
  },
} satisfies Meta<typeof PresetListTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A workspace export preset — click opens the editor, the overlay trash requests deletion. */
export const Default: Story = {};

/** Guest mode: both the tile and its delete overlay are disabled. */
export const Disabled: Story = {
  args: { disabled: true },
};

/** Long preset names truncate inside the half-width tile. */
export const LongName: Story = {
  args: {
    displayName: "Product gallery thumbnail — retina",
    dimensionsLabel: formatBeaconPresetDimensionsLabel({ width: 1200, height: 800 }),
  },
};
