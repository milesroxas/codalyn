import type { Meta, StoryObj } from "@storybook/react-vite";
import { Loader2 } from "lucide-react";
import { RouteLoadingSurface } from "@/shared/ui/route-loading";

const meta = {
  title: "UI/RouteLoading",
  component: RouteLoadingSurface,
  args: {
    layout: "shell",
  },
  argTypes: {
    layout: { control: "select", options: ["shell", "overlay", "route"] },
  },
} satisfies Meta<typeof RouteLoadingSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shell layout — in-scroll loader that grows to fill the route viewport. */
export const Shell: Story = {
  render: (args) => (
    <div className="flex h-80 flex-col">
      <RouteLoadingSurface {...args} role="status" aria-live="polite" aria-busy="true" aria-label="Loading CMS slots">
        <div className="flex flex-col items-center gap-3">
          <Loader2 aria-hidden className="size-6 shrink-0 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading CMS slots…</p>
        </div>
      </RouteLoadingSurface>
    </div>
  ),
};

/** Route layout — full-height surface for access gates without route chrome. */
export const Route: Story = {
  args: { layout: "route" },
  render: (args) => (
    <div className="flex h-96 flex-col">
      <RouteLoadingSurface {...args} role="status" aria-live="polite" aria-busy="true" aria-label="Checking access">
        <Loader2 aria-hidden className="size-6 shrink-0 animate-spin text-muted-foreground" />
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm text-muted-foreground">Checking access…</p>
          <p className="max-w-[18rem] text-balance text-center text-xs text-muted-foreground/80">
            Confirming your Tower session before opening the Composer.
          </p>
        </div>
      </RouteLoadingSurface>
    </div>
  ),
};

/** Overlay layout — full-bleed loader fixed over the extension viewport (covers the whole preview). */
export const Overlay: Story = {
  args: { layout: "overlay" },
  render: (args) => (
    <RouteLoadingSurface {...args} role="status" aria-live="polite" aria-busy="true" aria-label="Publishing slot">
      <div className="flex flex-col items-center gap-3">
        <Loader2 aria-hidden className="size-6 shrink-0 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Publishing slot…</p>
      </div>
    </RouteLoadingSurface>
  ),
};
