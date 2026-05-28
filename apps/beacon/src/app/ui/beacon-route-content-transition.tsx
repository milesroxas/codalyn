import { type ReactNode, type TransitionEvent, useCallback, useLayoutEffect, useRef, useState } from "react";
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
  /** When false, the panel stays at opacity 0 until ready. Fades in as soon as this becomes true. */
  contentReady?: boolean;
};

type PendingSwap = { key: string; child: ReactNode };

function applySameContentKeyUpdate(args: {
  children: ReactNode;
  contentReady: boolean;
  visible: boolean;
  prevContentReadyRef: { current: boolean };
  beginEnter: () => void;
  setRenderedChild: (child: ReactNode) => void;
  setVisible: (visible: boolean) => void;
}) {
  args.setRenderedChild(args.children);
  const becameReady = args.contentReady && !args.prevContentReadyRef.current;
  args.prevContentReadyRef.current = args.contentReady;
  if (!args.contentReady) {
    if (args.visible) {
      args.setVisible(false);
    }
    return;
  }
  if (becameReady && !args.visible) {
    args.beginEnter();
  }
}

function applyContentKeyChange(args: {
  contentKey: string;
  children: ReactNode;
  contentReady: boolean;
  visible: boolean;
  pendingRef: { current: PendingSwap | null };
  commitPendingSwap: (ready: boolean) => void;
  setVisible: (visible: boolean) => void;
}) {
  args.pendingRef.current = { key: args.contentKey, child: args.children };
  if (!args.visible) {
    args.commitPendingSwap(args.contentReady);
    return;
  }
  args.setVisible(false);
}

/**
 * Fades out the current route panel, swaps content when the key changes, then fades in the next panel.
 * Incoming panels start hidden and only become visible once `contentReady` is true.
 */
export function BeaconRouteContentTransition(props: BeaconRouteContentTransitionProps) {
  const { contentKey, children, className, contentReady = true } = props;
  const [renderedKey, setRenderedKey] = useState(contentKey);
  const [renderedChild, setRenderedChild] = useState(children);
  const [visible, setVisible] = useState(false);
  const pendingRef = useRef<{ key: string; child: ReactNode } | null>(null);
  const prevContentReadyRef = useRef(false);
  const enterRafRef = useRef<number | null>(null);
  const enterFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearEnterFallback = useCallback(() => {
    if (enterFallbackRef.current != null) {
      clearTimeout(enterFallbackRef.current);
      enterFallbackRef.current = null;
    }
  }, []);

  const beginEnter = useCallback(() => {
    clearEnterFallback();
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
  }, [clearEnterFallback]);

  const commitPendingSwap = useCallback(
    (ready: boolean) => {
      const pending = pendingRef.current;
      if (pending == null) {
        return;
      }
      pendingRef.current = null;
      setRenderedKey(pending.key);
      setRenderedChild(pending.child);
      prevContentReadyRef.current = ready;
      if (ready) {
        beginEnter();
      }
    },
    [beginEnter]
  );

  useLayoutEffect(() => {
    if (contentKey === renderedKey) {
      applySameContentKeyUpdate({
        children,
        contentReady,
        visible,
        prevContentReadyRef,
        beginEnter,
        setRenderedChild,
        setVisible,
      });
      return;
    }
    applyContentKeyChange({
      contentKey,
      children,
      contentReady,
      visible,
      pendingRef,
      commitPendingSwap,
      setVisible,
    });
  }, [contentKey, renderedKey, contentReady, visible, beginEnter, commitPendingSwap, children]);

  useLayoutEffect(() => {
    return () => {
      if (enterRafRef.current != null) {
        cancelAnimationFrame(enterRafRef.current);
      }
      if (enterFallbackRef.current != null) {
        clearTimeout(enterFallbackRef.current);
        enterFallbackRef.current = null;
      }
    };
  }, []);

  const handleTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== "opacity") {
      return;
    }
    if (visible) {
      return;
    }
    commitPendingSwap(contentReady);
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
