import type { Meta, StoryObj } from "@storybook/react-vite";
import { TelemetryConsentPrompt } from "@/features/settings/ui/telemetry-consent-prompt";
import { beaconScreen } from "~sb/beacon-app";

/**
 * First-run telemetry consent gate. Telemetry is opt-in: nothing is initialized or sent until the
 * user chooses here, and dismissing leaves the decision unset rather than recording consent. The
 * body enumerates every collected field and names PostHog as the sole processor.
 */
const meta = {
  title: "App/TelemetryConsentPrompt",
  component: TelemetryConsentPrompt,
  parameters: {
    layout: "fullscreen",
    ...beaconScreen("guest", { guestChosen: true }),
  },
} satisfies Meta<typeof TelemetryConsentPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Undecided consent — the state every first launch starts in. */
export const FirstRun: Story = {};
