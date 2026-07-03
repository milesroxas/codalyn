import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { StepNav, type StepNavItem } from "@/shared/ui/step-nav";

const FLOW_STEPS: StepNavItem[] = [
  {
    id: "select-page",
    label: "Select page",
    restartHint: "Go back to pick a different page. Your composition is kept.",
  },
  { id: "compose", label: "Compose" },
  { id: "sync", label: "Sync" },
];

const meta = {
  title: "UI/StepNav",
  component: StepNav,
  args: {
    "aria-label": "Compose flow steps",
    steps: FLOW_STEPS,
    current: "compose",
    onStepSelect: fn(),
  },
} satisfies Meta<typeof StepNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Mid-flow: “Select page” is past (clickable, hover it for the restart hint tooltip),
 * “Compose” is current, “Sync” is upcoming.
 */
export const Default: Story = {};

/** First step active — everything ahead is upcoming and non-interactive. */
export const FirstStep: Story = {
  args: { current: "select-page" },
};

/** Last step active — every earlier step is past and can be revisited. */
export const LastStep: Story = {
  args: { current: "sync" },
};

/** Without `onStepSelect` the nav renders as plain labels (read-only breadcrumb). */
export const ReadOnly: Story = {
  args: { onStepSelect: undefined },
};

/** Longer flows wrap within the 350px panel width. */
export const ManySteps: Story = {
  args: {
    "aria-label": "Image editor steps",
    steps: [
      { id: "target", label: "Target", restartHint: "Pick a different image target." },
      { id: "source", label: "Source", restartHint: "Choose another source image." },
      { id: "crop", label: "Crop" },
      { id: "preset", label: "Preset" },
      { id: "sync", label: "Sync" },
    ],
    current: "crop",
  },
};
