import { type ReactNode, type TransitionEvent, useLayoutEffect, useRef, useState } from "react";
import {
  BEACON_ROUTE_CONTENT_ENTER_DELAY_MS,
  BEACON_ROUTE_CONTENT_ENTER_TRANSITION_MS,
  beaconRouteContentTransitionMotionClass,
  beaconRouteContentVisibleClass,
} from "@/shared/lib/beacon-route-content-transition";
import { cn } from "@/shared/lib/utils";

type BeaconRouteContentTransitionProps = {
  contentKey: string;
  children: ReactNode;
  className?: string;
};

/**
 * Fades out the current route panel, swaps content when the key changes, then fades in the next panel.
 */
export function BeaconRouteContentTransition(props: BeaconRouteContentTransitionProps) {
  const { contentKey, children, className } = props;
  const [renderedKey, setRenderedKey] = useState(contentKey);
  const [renderedChild, setRenderedChild] = useState(children);
  const [visible, setVisible] = useState(true);
  const pendingRef = useRef<{ key: string; child: ReactNode } | null>(null);
  const enterRafRef = useRef<number | null>(null);
  const enterFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (contentKey === renderedKey) {
      setRenderedChild(children);
      if (!visible) {
        setVisible(true);
      }
      return;
    }
    pendingRef.current = { key: contentKey, child: children };
    setVisible(false);
  }, [contentKey, children, renderedKey, visible]);

  useLayoutEffect(() => {
    return () => {
      if (enterRafRef.current != null) {
        cancelAnimationFrame(enterRafRef.current);
      }
      if (enterFallbackRef.current != null) {
        clearTimeout(enterFallbackRef.current);
      }
    };
  }, []);

  const beginEnter = () => {
    setVisible(false);
    const id = requestAnimationFrame(() => {
      enterRafRef.current = requestAnimationFrame(() => {
        enterRafRef.current = null;
        setVisible(true);
      });
    });
    enterRafRef.current = id;
    enterFallbackRef.current = setTimeout(
      () => {
        enterFallbackRef.current = null;
        setVisible(true);
      },
      BEACON_ROUTE_CONTENT_ENTER_DELAY_MS + BEACON_ROUTE_CONTENT_ENTER_TRANSITION_MS + 48
    );
  };

  const handleTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== "opacity") {
      return;
    }
    if (visible) {
      return;
    }
    const pending = pendingRef.current;
    if (pending == null) {
      return;
    }
    pendingRef.current = null;
    setRenderedKey(pending.key);
    setRenderedChild(pending.child);
    beginEnter();
  };

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col", className)} data-slot="beacon_route_content_transition">
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          beaconRouteContentTransitionMotionClass,
          beaconRouteContentVisibleClass(visible)
        )}
        onTransitionEnd={handleTransitionEnd}
      >
        {renderedChild}
      </div>
    </div>
  );
}
