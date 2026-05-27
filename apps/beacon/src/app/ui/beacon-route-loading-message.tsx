import { type TransitionEvent, useLayoutEffect, useRef, useState } from "react";
import {
  BEACON_ROUTE_CONTENT_ENTER_DELAY_MS,
  BEACON_ROUTE_CONTENT_ENTER_TRANSITION_MS,
  beaconRouteContentTransitionMotionClass,
  beaconRouteContentVisibleClass,
} from "@/shared/lib/beacon-route-content-transition";
import { cn } from "@/shared/lib/utils";

type BeaconRouteLoadingMessageProps = {
  message: string;
  className?: string;
};

/** Crossfades loading copy when the active task changes while the overlay stays visible. */
export function BeaconRouteLoadingMessage(props: BeaconRouteLoadingMessageProps) {
  const { message, className } = props;
  const [renderedMessage, setRenderedMessage] = useState(message);
  const [visible, setVisible] = useState(true);
  const pendingRef = useRef<string | null>(null);
  const enterRafRef = useRef<number | null>(null);
  const enterFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (message === renderedMessage) {
      if (!visible) {
        setVisible(true);
      }
      return;
    }
    pendingRef.current = message;
    setVisible(false);
  }, [message, renderedMessage, visible]);

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

  const handleTransitionEnd = (e: TransitionEvent<HTMLParagraphElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== "opacity" || visible) {
      return;
    }
    const pending = pendingRef.current;
    if (pending == null) {
      return;
    }
    pendingRef.current = null;
    setRenderedMessage(pending);
    beginEnter();
  };

  return (
    <p
      className={cn(
        "max-w-[16rem] text-center text-muted-foreground text-sm",
        beaconRouteContentTransitionMotionClass,
        beaconRouteContentVisibleClass(visible),
        className
      )}
      data-slot="beacon_route_loading_message"
      onTransitionEnd={handleTransitionEnd}
    >
      {renderedMessage}
    </p>
  );
}
