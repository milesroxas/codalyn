import { Loader2 } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BEACON_ROUTE_CONTENT_ENTER_TRANSITION_MS,
  beaconRouteContentTransitionMotionClass,
  beaconRouteContentVisibleClass,
} from "@/shared/lib/beacon-route-content-transition";
import { cn } from "@/shared/lib/utils";

type BeaconRouteLoadingOverlayProps = {
  visible: boolean;
  ariaLabel: string;
  className?: string;
};

/**
 * Full-bleed loader over a `relative` route scroll region. Appears opaque immediately; fades out when hidden.
 */
export function BeaconRouteLoadingOverlay(props: BeaconRouteLoadingOverlayProps) {
  const { visible, ariaLabel, className } = props;
  const [mounted, setMounted] = useState(visible);
  /** Opaque immediately when shown — fade-out only, so content never flashes through first. */
  const [shown, setShown] = useState(visible);
  const exitFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (visible) {
      setMounted(true);
      setShown(true);
      return undefined;
    }
    if (mounted) {
      setShown(false);
    }
    return undefined;
  }, [visible, mounted]);

  useEffect(() => {
    if (visible || !mounted) {
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
  }, [visible, mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/85 backdrop-blur-[1px]",
        beaconRouteContentTransitionMotionClass,
        beaconRouteContentVisibleClass(shown),
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
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
      <Loader2 aria-hidden className="size-6 shrink-0 animate-spin text-muted-foreground" />
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}
