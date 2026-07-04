import type { Meta, StoryObj } from "@storybook/react-vite";
import { BeaconHomeScreen } from "@/app/ui/beacon-home-screen";
import { beaconScreen } from "~sb/beacon-app";
import { fakePage } from "~sb/webflow-fixtures";

/**
 * The Home hub: feature tiles gated by persona (Tower session + workspace role) and by the
 * current Designer page (CMS Slots needs a CMS collection template page).
 */
const meta = {
  title: "App/HomeScreen",
  component: BeaconHomeScreen,
  parameters: {
    layout: "fullscreen",
    // `guestChosen` skips the first-run welcome gate; see GuestWelcome for the gate itself.
    ...beaconScreen("guest", { guestChosen: true }),
  },
} satisfies Meta<typeof BeaconHomeScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Guest who chose "Continue as guest": tiles visible, Tower-backed features prompt sign-in. */
export const Guest: Story = {};

/** First-run gate shown to every signed-out load until "Continue as guest" or sign-in. */
export const GuestWelcome: Story = {
  parameters: beaconScreen("guest", { guestChosen: false }),
};

/** Signed in, no team workspace. */
export const SignedInFree: Story = {
  parameters: beaconScreen("freeUser"),
};

/** Editor-experience member: editor-scoped tiles and CMS Slots defaulting to Composer. */
export const TeamEditor: Story = {
  parameters: beaconScreen("teamEditor"),
};

/** Team admin on a static page: CMS Slots tile asks for a CMS collection template page. */
export const TeamAdmin: Story = {
  parameters: beaconScreen("teamAdmin"),
};

/** Team admin with the Designer on a CMS collection template: CMS Slots tile fully enabled. */
export const TeamAdminOnCmsTemplate: Story = {
  parameters: beaconScreen("teamAdmin", { page: fakePage("cms") }),
};
