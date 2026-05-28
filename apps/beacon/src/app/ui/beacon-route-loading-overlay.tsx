import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BeaconRouteLoadingStatus } from "@/app/ui/beacon-route-loading-status";
import {
  BEACON_ROUTE_CONTENT_ENTER_TRANSITION_MS,
  beaconRouteContentTransitionMotionClass,
} from "@/shared/lib/beacon-route-content-transition";
import { cn } from "@/shared/lib/utils";
import { RouteLoadingSurface } from "@/shared/ui/route-loading";

type BeaconRouteLoadingOverlayProps = {
  visible: boolean;
  /** When set, skips an internal deferred-loading timer (pass from a parent that already deferred the same signal). */
  deferredVisible?: boolean;
  /** Fires when the overlay mounts or fully unmounts after its exit transition. */
  onOccupancyChange?: (occupied: boolean) => void;
  ariaLabel: string;
  message?: string;
  className?: string;
};

/**
 * Full-bleed loader portaled above route drawers and dialogs. Appears opaque immediately; fades out when hidden.
 * Loading chrome is deferred until busy has lasted at least the standard loading-indicator delay.
 */
export function BeaconRouteLoadingOverlay(props: BeaconRouteLoadingOverlayProps) {
  if (props.deferredVisible !== undefined) {
    return <BeaconRouteLoadingOverlayShell {...props} showVisible={props.deferredVisible} />;
  }
  return <BeaconRouteLoadingOverlayDeferred {...props} />;
}

function BeaconRouteLoadingOverlayDeferred(props: BeaconRouteLoadingOverlayProps) {
  const showVisible = useDeferredLoadingIndicator(props.visible);
  return <BeaconRouteLoadingOverlayShell {...props} showVisible={showVisible} />;
}

type BeaconRouteLoadingOverlayShellProps = BeaconRouteLoadingOverlayProps & {
  showVisible: boolean;
};

function BeaconRouteLoadingOverlayShell(props: BeaconRouteLoadingOverlayShellProps) {
  const { showVisible, onOccupancyChange, ariaLabel, message, className } = props;
  const [mounted, setMounted] = useState(showVisible);
  /** Opaque immediately when shown — fade-out only, so content never flashes through first. */
  const [shown, setShown] = useState(showVisible);
  const exitFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onOccupancyChange?.(mounted);
  }, [mounted, onOccupancyChange]);

  useLayoutEffect(() => {
    if (showVisible) {
      setMounted(true);
      setShown(true);
      return undefined;
    }
    if (mounted) {
      setShown(false);
    }
    return undefined;
  }, [showVisible, mounted]);

  useEffect(() => {
    if (showVisible || !mounted) {
      if (exitFallbackRef.current != null) {
        clearTimeout(exitFallbackRef.current);
        exitFallbackRef.current = null;
      }
      return undefined;
    }
    exitFallbackRef.current = setTimeout(() => {
      exitFallbackRef.current = null;
      setMounted(false);
    }, BEACON_ROUTE_CONTENT_ENTER_TRANSITION_MS + 80);
    return () => {
      if (exitFallbackRef.current != null) {
        clearTimeout(exitFallbackRef.current);
        exitFallbackRef.current = null;
      }
    };
  }, [showVisible, mounted]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <RouteLoadingSurface
      layout="overlay"
      className={cn(
        beaconRouteContentTransitionMotionClass,
        shown ? "opacity-100" : "opacity-0",
        "pointer-events-auto",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
      data-slot="beacon_route_loading_overlay"
      onTransitionEnd={(e) => {
        if (e.target !== e.currentTarget || e.propertyName !== "opacity" || shown) {
          return;
        }
        if (exitFallbackRef.current != null) {
          clearTimeout(exitFallbackRef.current);
          exitFallbackRef.current = null;
        }
        setMounted(false);
      }}
    >
      <BeaconRouteLoadingStatus ariaLabel={ariaLabel} message={message} />
    </RouteLoadingSurface>,
    document.body
  );
}
