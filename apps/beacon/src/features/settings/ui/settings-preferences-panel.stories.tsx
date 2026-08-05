import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsPreferencesPanel } from "@/features/settings/ui/settings-preferences-panel";
import { beaconScreen } from "~sb/beacon-app";

/**
 * Settings → Preferences: theme selection plus the Privacy disclosure required by the Webflow
 * Marketplace privacy guidelines — the telemetry opt-in switch, the enumerated collection notice,
 * and the links out to the published privacy policy and terms.
 */
const meta = {
  title: "App/SettingsPreferences",
  component: SettingsPreferencesPanel,
  parameters: {
    layout: "fullscreen",
    ...beaconScreen("guest", { guestChosen: true }),
  },
} satisfies Meta<typeof SettingsPreferencesPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Guest: telemetry consent is undecided, so the switch reads off. */
export const Guest: Story = {};

/** Signed in — the disclosure additionally covers account settings sync. */
export const SignedIn: Story = {
  parameters: beaconScreen("freeUser"),
};
