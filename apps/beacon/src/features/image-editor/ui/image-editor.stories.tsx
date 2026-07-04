import type { Meta, StoryObj } from "@storybook/react-vite";
import { ImageEditor } from "@/features/image-editor";
import { beaconScreen } from "~sb/beacon-app";

/**
 * Screen-level smoke stories: the full Image Upload flow mounted under the app-shell harness.
 * With the stubbed Designer the screen settles on its entry state (dropzone + source sections);
 * per-step visual states live in the presentational `ImageEditor/*` stories instead.
 */
const meta = {
  title: "App/ImageEditorScreen",
  component: ImageEditor,
  parameters: {
    layout: "fullscreen",
    ...beaconScreen("guest", { guestChosen: true, route: "/images" }),
  },
} satisfies Meta<typeof ImageEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Guest entry state: local-only workflow, Tower upsells where relevant. */
export const Guest: Story = {};

/** Signed-in solo user: personal export defaults persist. */
export const SignedInFree: Story = {
  parameters: beaconScreen("freeUser", { route: "/images" }),
};

/** Team admin: team preset management available in the flow. */
export const TeamAdmin: Story = {
  parameters: beaconScreen("teamAdmin", { route: "/images" }),
};

/** Editor-experience member: limited flow driven by designer-managed team presets. */
export const TeamEditor: Story = {
  parameters: beaconScreen("teamEditor", { route: "/images" }),
};
