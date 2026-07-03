import type { Meta, StoryObj } from "@storybook/react-vite";
import { Database, ImagePlus, Plus, ScanSearch } from "lucide-react";
import { fn } from "storybook/test";
import {
  Empty,
  EmptyAction,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/ui/empty";

const meta = {
  title: "UI/Empty",
  component: Empty,
  args: {
    tone: "default",
    layout: "vertical",
  },
  argTypes: {
    tone: { control: "select", options: ["default", "plain", "insetPanel"] },
    layout: { control: "select", options: ["vertical", "horizontal", "horizontalStacked"] },
  },
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — the canonical dashed-border vertical empty state. */
export const Default: Story = {
  render: (args) => (
    <Empty {...args}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Database aria-hidden />
        </EmptyMedia>
        <EmptyTitle>No CMS slots yet</EmptyTitle>
        <EmptyDescription>Create a slot to start composing CMS content on this page.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent layout="actions">
        <EmptyAction onClick={fn()}>
          <Plus data-icon="inline-start" aria-hidden />
          Add your first slot
        </EmptyAction>
      </EmptyContent>
    </Empty>
  ),
};

/** The three tones in the vertical layout: dashed card, bare, and inset panel. */
export const Tones: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {(["default", "plain", "insetPanel"] as const).map((tone) => (
        <Empty key={tone} {...args} tone={tone}>
          <EmptyHeader>
            <EmptyTitle>No image presets</EmptyTitle>
            <EmptyDescription size="compact">Presets set the export size for canvas images.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ))}
    </div>
  ),
};

/** Inset-panel horizontal layout: icon left, copy beside, action on the right. */
export const HorizontalInsetPanel: Story = {
  args: { tone: "insetPanel", layout: "horizontal" },
  render: (args) => (
    <Empty {...args}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ScanSearch aria-hidden />
        </EmptyMedia>
        <EmptyTitle>No image targets found</EmptyTitle>
        <EmptyDescription size="compact">Scan the page to find images to optimize.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent layout="actions">
        <EmptyAction width="fit" onClick={fn()}>
          Scan page
        </EmptyAction>
      </EmptyContent>
    </Empty>
  ),
};

/** Inset-panel stacked layout: compact left-aligned copy with the action below. */
export const HorizontalStacked: Story = {
  args: { tone: "insetPanel", layout: "horizontalStacked" },
  render: (args) => (
    <Empty {...args}>
      <EmptyHeader>
        <EmptyTitle>Nothing to sync</EmptyTitle>
        <EmptyDescription size="compact">Compose a slot before running a sync.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent layout="actions">
        <EmptyAction onClick={fn()}>
          <ImagePlus data-icon="inline-start" aria-hidden />
          Open Composer
        </EmptyAction>
      </EmptyContent>
    </Empty>
  ),
};

/** Full-width header with a hint block below (`EmptyContent layout="hint"`). */
export const WithHint: Story = {
  args: { tone: "plain" },
  render: (args) => (
    <Empty {...args}>
      <EmptyHeader width="full">
        <EmptyTitle>No published slots on this page</EmptyTitle>
        <EmptyDescription>Slots publish when their component is placed on the canvas and synced.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent layout="hint">
        <p className="text-xs text-muted-foreground">
          Tip: use <strong>Scan page</strong> to find components that already accept CMS content.
        </p>
      </EmptyContent>
    </Empty>
  ),
};
