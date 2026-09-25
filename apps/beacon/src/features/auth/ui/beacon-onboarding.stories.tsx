import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { BeaconOnboarding } from "@/features/auth/ui/beacon-onboarding";

const meta = {
  title: "Auth/BeaconOnboarding",
  component: BeaconOnboarding,
  args: {
    towerConfigured: true,
    earlyAccessRequired: true,
    onContinueAsGuest: fn(),
  },
} satisfies Meta<typeof BeaconOnboarding>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Invite-only gate on: "Continue with Webflow" (the Designer ID-token exchange, on click) above the
 * inline Tower email sign-in, plus a "Request access" escape hatch that swaps the card to the inline
 * request form (no new window). Both sign-in controls are live — the Webflow button fails soft with
 * no Designer runtime, the email form hits the mocked Tower origin and fails soft.
 */
export const EarlyAccessGate: Story = {};

/** Public sign-up open (`earlyAccessRequired: false`) — the request-access button disappears. */
export const PublicSignUp: Story = {
  args: { earlyAccessRequired: false },
};

/** No Tower origin configured for this environment — guest is the only path forward. */
export const TowerUnavailable: Story = {
  args: { towerConfigured: false },
};
