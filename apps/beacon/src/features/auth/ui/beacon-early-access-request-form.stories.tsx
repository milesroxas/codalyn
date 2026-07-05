import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { BeaconEarlyAccessRequestForm } from "@/features/auth/ui/beacon-early-access-request-form";

const meta = {
  title: "Auth/BeaconEarlyAccessRequestForm",
  component: BeaconEarlyAccessRequestForm,
  args: {
    onBackToSignIn: fn(),
  },
} satisfies Meta<typeof BeaconEarlyAccessRequestForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Inline early-access request as rendered inside the onboarding card. The form is live —
 * submitting hits the mocked Tower origin, which acks with `outcome: "created"` and flips
 * the form to its success state.
 */
export const Default: Story = {};
