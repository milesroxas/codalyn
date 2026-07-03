import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "@/shared/ui/skeleton";

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  args: {
    className: "h-4 w-44",
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A single pulsing line — size it with layout classes only. */
export const Default: Story = {};

/** Realistic loading layout: a surface-summary row plus a tile grid, as on the CMS Slots route. */
export const LoadingLayout: Story = {
  render: () => (
    <div className="flex w-full max-w-80 flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-9" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-32" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    </div>
  ),
};
