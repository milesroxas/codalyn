import type { Meta, StoryObj } from "@storybook/react-vite";
import type { UsageApproachingLimitMeter } from "@/shared/ui/usage-approaching-limit-details";
import { UsageApproachingLimitDetails } from "@/shared/ui/usage-approaching-limit-details";

const APPROACHING_METERS: UsageApproachingLimitMeter[] = [
  { kind: "cmsWrite", used: 41, limit: 50 },
  { kind: "image", used: 86, limit: 100 },
];

const ALL_METER_KINDS: UsageApproachingLimitMeter[] = [
  { kind: "webflowProxy", used: 412, limit: 500 },
  { kind: "cmsWrite", used: 41, limit: 50 },
  { kind: "image", used: 86, limit: 100 },
];

const meta = {
  title: "UI/UsageApproachingLimitDetails",
  component: UsageApproachingLimitDetails,
  args: {
    meters: APPROACHING_METERS,
    usageScope: "user",
    showMeterInfoTooltip: true,
  },
  argTypes: {
    usageScope: { control: "select", options: ["user", "workspace"] },
  },
} satisfies Meta<typeof UsageApproachingLimitDetails>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Per-user scope with the meter info tooltips enabled. */
export const Default: Story = {};

/** Every meter kind: Designer API proxy calls, CMS writes, and image operations. */
export const AllMeterKinds: Story = {
  args: { meters: ALL_METER_KINDS },
};

/** Pooled workspace scope — copy explains the shared Team pool. */
export const WorkspaceScope: Story = {
  args: { usageScope: "workspace" },
};

/** Tooltip triggers omitted — as rendered inside the details dialog. */
export const WithoutInfoTooltips: Story = {
  args: { showMeterInfoTooltip: false },
};

/** Single meter close to its cap. */
export const SingleMeter: Story = {
  args: { meters: [{ kind: "cmsWrite", used: 49, limit: 50 }] },
};
