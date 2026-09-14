import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { BeaconTowerActionList } from "@/features/auth/ui/beacon-tower-action-list";

/**
 * The Tower shortcuts pane inside the app menu. Every Tower destination is an ordinary new-tab link
 * (the extension opens no windows); without a Designer session the links carry the plain Tower route,
 * with one they carry a pre-minted single-use session handoff. Sign out stays a button.
 */
const meta = {
  title: "Auth/BeaconTowerActionList",
  component: BeaconTowerActionList,
  decorators: [
    (Story) => (
      <div className="w-72 rounded-sm border border-border bg-popover px-3">
        <Story />
      </div>
    ),
  ],
  args: { onSignOut: fn() },
} satisfies Meta<typeof BeaconTowerActionList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tower configured (Storybook's mocked origin): three link rows plus the destructive sign-out row. */
export const Default: Story = {};
