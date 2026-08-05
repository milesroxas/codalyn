import { RotateCcw, TriangleAlert } from "lucide-react";
import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { beaconAppRouteSurfaceClass } from "@/shared/lib/beacon-app-route-surface";
import { captureObservabilityException } from "@/shared/lib/init-observability";
import { cn } from "@/shared/lib/utils";
import {
  Empty,
  EmptyAction,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/ui/empty";

/**
 * Fallback rendered in place of the whole panel when a render throws. Deliberately generic —
 * the underlying error goes to telemetry, never to the user.
 */
export function ErrorBoundaryFallback(props: { onRetry: () => void }) {
  return (
    <div
      data-slot="beacon_error_boundary_fallback"
      role="alert"
      className={cn(beaconAppRouteSurfaceClass, "items-center justify-center p-4")}
    >
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlert aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription size="compact">
            Sorry &mdash; Beacon ran into an unexpected problem. Try again, or close and reopen the app if it keeps
            happening.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent layout="actions">
          <EmptyAction width="fit" onClick={props.onRetry}>
            <RotateCcw data-icon="inline-start" aria-hidden />
            Try again
          </EmptyAction>
        </EmptyContent>
      </Empty>
    </div>
  );
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    captureObservabilityException(error, {
      componentStack: errorInfo.componentStack,
    });
  }

  /** Clears the caught state so the children subtree remounts from scratch. */
  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorBoundaryFallback onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
