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
  beginExit: () => void;
}) {
  // A non-null pending swap means a fade-out is already animating from a prior key change.
  const fadeOutInFlight = args.pendingRef.current != null;
  args.pendingRef.current = { key: args.contentKey, child: args.children };
  if (args.visible) {
    args.beginExit();
    return;
  }
  if (fadeOutInFlight) {
    // Visible is already false because a fade-out is mid-flight (this effect re-runs the moment `setVisible(false)`
    // flips the `visible` dep, before the swap commits). Committing here would abort the exit ~0ms in and swap
    // instantly. Leave the running fade-out alone — its transitionEnd (or fallback timer) commits the latest pending.
    return;
  }
  // Content is genuinely idle and already hidden — there is no exit to play, so swap straight to the pending child.
  args.commitPendingSwap(args.contentReady);
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
  const exitFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest readiness, read by the exit fallback timer without re-creating it each render.
  const contentReadyRef = useRef(contentReady);
  contentReadyRef.current = contentReady;

  const clearEnterFallback = useCallback(() => {
    if (enterFallbackRef.current != null) {
      clearTimeout(enterFallbackRef.current);
      enterFallbackRef.current = null;
    }
  }, []);

  const clearExitFallback = useCallback(() => {
    if (exitFallbackRef.current != null) {
      clearTimeout(exitFallbackRef.current);
      exitFallbackRef.current = null;
    }
  }, []);

  const beginEnter = useCallback(() => {
    clearEnterFallback();
    clearExitFallback();
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
  }, [clearEnterFallback, clearExitFallback]);

  const commitPendingSwap = useCallback(
    (ready: boolean) => {
      clearExitFallback();
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
    [beginEnter, clearExitFallback]
  );

  // Starts the outgoing fade. The opacity transitionEnd normally commits the swap; the fallback guarantees a
  // commit even when no transition fires (prefers-reduced-motion, a hidden/detached node, an interrupted fade).
  const beginExit = useCallback(() => {
    clearEnterFallback();
    setVisible(false);
    clearExitFallback();
    exitFallbackRef.current = setTimeout(() => {
      exitFallbackRef.current = null;
      commitPendingSwap(contentReadyRef.current);
    }, BEACON_ROUTE_CONTENT_ENTER_TRANSITION_MS + 48);
  }, [clearEnterFallback, clearExitFallback, commitPendingSwap]);

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
      beginExit,
    });
  }, [contentKey, renderedKey, contentReady, visible, beginEnter, commitPendingSwap, beginExit, children]);

  useLayoutEffect(() => {
    return () => {
      if (enterRafRef.current != null) {
        cancelAnimationFrame(enterRafRef.current);
      }
      if (enterFallbackRef.current != null) {
        clearTimeout(enterFallbackRef.current);
        enterFallbackRef.current = null;
      }
      if (exitFallbackRef.current != null) {
        clearTimeout(exitFallbackRef.current);
        exitFallbackRef.current = null;
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
