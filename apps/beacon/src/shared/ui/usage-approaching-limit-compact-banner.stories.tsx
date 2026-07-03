import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Button } from "@/shared/ui/button";
import { UsageApproachingLimitCompactBanner } from "@/shared/ui/usage-approaching-limit-compact-banner";
import type { UsageApproachingLimitMeter } from "@/shared/ui/usage-approaching-limit-details";

const APPROACHING_METERS: UsageApproachingLimitMeter[] = [
  { kind: "cmsWrite", used: 41, limit: 50 },
  { kind: "image", used: 86, limit: 100 },
];

const meta = {
  title: "UI/UsageApproachingLimitCompactBanner",
  component: UsageApproachingLimitCompactBanner,
  args: {
    meters: APPROACHING_METERS,
    usageScope: "user",
  },
  argTypes: {
    usageScope: { control: "select", options: ["user", "workspace"] },
    upgradeAction: { table: { disable: true } },
  },
} satisfies Meta<typeof UsageApproachingLimitCompactBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Flush warning strip — open the Details dialog to see the per-meter breakdown. */
export const Default: Story = {};

/** One meter approaching its cap. */
export const SingleMeter: Story = {
  args: { meters: [{ kind: "image", used: 95, limit: 100 }] },
};

/** All meter kinds approaching at once. */
export const AllMeterKinds: Story = {
  args: {
    meters: [
      { kind: "webflowProxy", used: 412, limit: 500 },
      { kind: "cmsWrite", used: 41, limit: 50 },
      { kind: "image", used: 86, limit: 100 },
    ],
  },
};

/** Pooled workspace scope with a billing lever in the dialog footer (mirrors the Beacon banner). */
export const WorkspaceWithUpgradeAction: Story = {
  args: {
    usageScope: "workspace",
    upgradeAction: (
      <Button type="button" variant="outline" size="sm" onClick={fn()}>
        Open Tower billing
      </Button>
    ),
  },
};
