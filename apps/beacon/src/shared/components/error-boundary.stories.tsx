import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ErrorBoundary, ErrorBoundaryFallback } from "@/shared/components/error-boundary";

const meta = {
  title: "UI/ErrorBoundary",
  component: ErrorBoundaryFallback,
  args: {
    onRetry: fn(),
  },
} satisfies Meta<typeof ErrorBoundaryFallback>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * What the whole Designer panel shows when a render throws. Copy stays generic on purpose — the
 * real error goes to telemetry, never to the user.
 */
export const Fallback: Story = {};

let thrownOnce = false;

/** Throws on its first render only, so "Try again" visibly remounts the subtree. */
function ThrowsOnFirstRender() {
  if (!thrownOnce) {
    thrownOnce = true;
    throw new Error("Storybook demo: a child component threw during render");
  }
  return <p className="text-muted-foreground text-sm">Recovered — the subtree remounted cleanly.</p>;
}

/** The live boundary: catches the throw, then restores its children when "Try again" is pressed. */
export const CaughtAndRecovered: Story = {
  render: () => {
    thrownOnce = false;
    return (
      <ErrorBoundary>
        <ThrowsOnFirstRender />
      </ErrorBoundary>
    );
  },
};
