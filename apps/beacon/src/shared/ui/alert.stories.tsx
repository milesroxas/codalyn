import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronRight, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { fn } from "storybook/test";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

const VARIANTS = ["default", "info", "warning", "destructive"] as const;

const meta = {
  title: "UI/Alert",
  component: Alert,
  args: {
    variant: "default",
    size: "default",
    frame: "card",
  },
  argTypes: {
    variant: { control: "select", options: [...VARIANTS] },
    size: { control: "select", options: ["default", "compact"] },
    frame: { control: "select", options: ["card", "flush"] },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — flip variant/size/frame from the Controls panel. */
export const Default: Story = {
  render: (args) => (
    <Alert {...args}>
      <Info aria-hidden />
      <AlertTitle>Presets apply on export</AlertTitle>
      <AlertDescription>
        Image presets resize assets when they are exported to Webflow, not on the canvas.
      </AlertDescription>
    </Alert>
  ),
};

/** All four intents at the default (card) size. */
export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      <Alert {...args} variant="default">
        <Info aria-hidden />
        <AlertTitle>Slot published</AlertTitle>
        <AlertDescription>Blog posts is now available in the Composer.</AlertDescription>
      </Alert>
      <Alert {...args} variant="info">
        <Info aria-hidden />
        <AlertTitle>Presets apply on export</AlertTitle>
        <AlertDescription>Image presets resize assets when they are exported, not on the canvas.</AlertDescription>
      </Alert>
      <Alert {...args} variant="warning">
        <TriangleAlert aria-hidden />
        <AlertTitle>Approaching monthly limit</AlertTitle>
        <AlertDescription>You have used 41 of 50 CMS write credits this month.</AlertDescription>
      </Alert>
      <Alert {...args} variant="destructive">
        <CircleAlert aria-hidden />
        <AlertTitle>Sync failed</AlertTitle>
        <AlertDescription>Webflow rejected 3 CMS writes. Check the collection fields and retry.</AlertDescription>
      </Alert>
    </div>
  ),
};

/** Default vs compact scale — compact is a single-line strip pairing with `2xs` buttons. */
export const Sizes: Story = {
  args: { variant: "warning" },
  render: (args) => (
    <div className="flex flex-col gap-3">
      <Alert {...args} size="default">
        <TriangleAlert aria-hidden />
        <AlertTitle>Approaching monthly limit</AlertTitle>
        <AlertDescription>You have used 41 of 50 CMS write credits this month.</AlertDescription>
      </Alert>
      <Alert {...args} size="compact">
        <TriangleAlert aria-hidden />
        <AlertTitle>Approaching monthly limit</AlertTitle>
      </Alert>
    </div>
  ),
};

/** Corner-placed action floats top-right; the alert reserves right padding for it. */
export const WithCornerAction: Story = {
  args: { variant: "warning", size: "compact" },
  render: (args) => (
    <Alert {...args}>
      <TriangleAlert aria-hidden />
      <AlertTitle>Approaching monthly limit</AlertTitle>
      <AlertAction placement="corner">
        <Button type="button" variant="outline" size="2xs" onClick={fn()}>
          Details
          <ChevronRight data-icon="inline-end" aria-hidden />
        </Button>
      </AlertAction>
    </Alert>
  ),
};

/** Block-placed actions stay in the text column — for wide actions in the narrow panel. */
export const WithBlockActions: Story = {
  args: { variant: "destructive" },
  render: (args) => (
    <Alert {...args}>
      <CircleAlert aria-hidden />
      <AlertTitle>Sync failed</AlertTitle>
      <AlertDescription>Webflow rejected 3 CMS writes. Check the collection fields and retry.</AlertDescription>
      <AlertAction placement="block">
        <Button type="button" variant="outline" size="xs" onClick={fn()}>
          Retry sync
        </Button>
        <Button type="button" variant="ghost" size="xs" onClick={fn()}>
          Dismiss
        </Button>
      </AlertAction>
    </Alert>
  ),
};

/** Flush frame — borderless full-bleed strip beneath app chrome (animates in on mount). */
export const FlushBanner: Story = {
  args: { variant: "warning", size: "compact", frame: "flush" },
  render: (args) => (
    <Alert {...args}>
      <TriangleAlert aria-hidden />
      <AlertTitle>Approaching monthly limit</AlertTitle>
      <AlertAction placement="corner">
        <Button type="button" variant="outline" size="2xs" onClick={fn()}>
          Details
          <ChevronRight data-icon="inline-end" aria-hidden />
        </Button>
      </AlertAction>
    </Alert>
  ),
};
