import type { Meta, StoryObj } from "@storybook/react-vite";
import { Progress } from "@/shared/ui/progress";

const meta = {
  title: "UI/Progress",
  component: Progress,
  args: {
    value: 40,
    indeterminate: false,
    indicatorLevel: "ok",
  },
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100, step: 1 } },
    indicatorLevel: { control: "select", options: ["ok", "approaching", "exceeded", "unmetered"] },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — drag the value and switch the indicator level. */
export const Default: Story = {};

/** The full sweep, including both edges (0 and 100). */
export const Values: Story = {
  render: (args) => (
    <div className="flex w-64 flex-col gap-3">
      {[0, 25, 50, 75, 100].map((value) => (
        <div key={value} className="flex items-center gap-3">
          <Progress {...args} value={value} aria-label={`${value} percent used`} />
          <span className="w-8 text-right text-xs text-muted-foreground tabular-nums">{value}</span>
        </div>
      ))}
    </div>
  ),
};

/** Usage-meter levels: ok, approaching (80%+), exceeded, and unmetered accounts. */
export const IndicatorLevels: Story = {
  render: (args) => (
    <div className="flex w-64 flex-col gap-4">
      {(
        [
          { indicatorLevel: "ok", value: 40, label: "12 of 30 image credits" },
          { indicatorLevel: "approaching", value: 82, label: "41 of 50 CMS writes" },
          { indicatorLevel: "exceeded", value: 100, label: "50 of 50 CMS writes" },
          { indicatorLevel: "unmetered", value: 35, label: "Unmetered plan" },
        ] as const
      ).map((meter) => (
        <div key={meter.indicatorLevel} className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{meter.label}</span>
          <Progress {...args} value={meter.value} indicatorLevel={meter.indicatorLevel} aria-label={meter.label} />
        </div>
      ))}
    </div>
  ),
};

/** Indeterminate sweep for work without a known total (e.g. scanning a page). */
export const Indeterminate: Story = {
  args: { indeterminate: true },
  render: (args) => (
    <div className="w-64">
      <Progress {...args} aria-label="Scanning page for image targets" />
    </div>
  ),
};
