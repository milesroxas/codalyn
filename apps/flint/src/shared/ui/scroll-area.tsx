import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as React from "react";

import { cn } from "@/shared/utils";

interface ScrollAreaProps extends React.ComponentProps<typeof ScrollAreaPrimitive.Root> {
  onIsScrolledChange?: (value: boolean) => void;
  onScrollDirectionChange?: (direction: "up" | "down") => void;
}

const SCROLL_DIR_THRESHOLD_PX = 32;
const SCROLL_DIR_MIN_INTERVAL_MS = 150;

type DirectionRefs = {
  emittedDir: React.MutableRefObject<"up" | "down" | null>;
  pendingDir: React.MutableRefObject<"up" | "down" | null>;
  pendingAccum: React.MutableRefObject<number>;
  lastEmitTime: React.MutableRefObject<number>;
};

function tryEmitDirection(
  dir: "up" | "down",
  _absDelta: number,
  nearBottom: boolean,
  nearTop: boolean,
  passedThreshold: boolean,
  refs: DirectionRefs,
  onScrollDirectionChange: (direction: "up" | "down") => void
): void {
  const blockedByBottom = dir === "up" ? false : nearBottom && !passedThreshold;
  const blockedByTop = dir === "down" ? false : nearTop && !passedThreshold;
  const now = Date.now();
  const timeSinceLastEmit = now - refs.lastEmitTime.current;
  if (!passedThreshold || blockedByBottom || blockedByTop || timeSinceLastEmit < SCROLL_DIR_MIN_INTERVAL_MS) {
    return;
  }
  refs.emittedDir.current = dir;
  refs.pendingDir.current = null;
  refs.pendingAccum.current = 0;
  refs.lastEmitTime.current = now;
  onScrollDirectionChange(dir);
}

function updatePendingDirection(dir: "up" | "down", absDelta: number, refs: DirectionRefs): void {
  if (refs.pendingDir.current === dir) {
    refs.pendingAccum.current += absDelta;
  } else {
    refs.pendingDir.current = dir;
    refs.pendingAccum.current = absDelta;
  }
}

function handleScrollDirection(
  el: HTMLDivElement,
  delta: number,
  absDelta: number,
  refs: DirectionRefs,
  lastTopRef: React.MutableRefObject<number>,
  onScrollDirectionChange: (direction: "up" | "down") => void
): void {
  if (absDelta < 2) {
    lastTopRef.current = el.scrollTop;
    return;
  }

  const dir: "up" | "down" = delta > 0 ? "down" : "up";
  const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
  const nearBottom = el.scrollTop >= maxTop - 8;
  const nearTop = el.scrollTop <= 8;

  if (refs.emittedDir.current === null) {
    updatePendingDirection(dir, absDelta, refs);
    const passedThreshold = refs.pendingAccum.current >= SCROLL_DIR_THRESHOLD_PX;
    tryEmitDirection(dir, absDelta, nearBottom, nearTop, passedThreshold, refs, onScrollDirectionChange);
    lastTopRef.current = el.scrollTop;
    return;
  }

  if (dir === refs.emittedDir.current) {
    refs.pendingDir.current = null;
    refs.pendingAccum.current = 0;
    lastTopRef.current = el.scrollTop;
    return;
  }

  updatePendingDirection(dir, absDelta, refs);
  const passedThreshold = refs.pendingAccum.current >= SCROLL_DIR_THRESHOLD_PX;
  tryEmitDirection(dir, absDelta, nearBottom, nearTop, passedThreshold, refs, onScrollDirectionChange);
  lastTopRef.current = el.scrollTop;
}

function ScrollArea({ className, children, onIsScrolledChange, onScrollDirectionChange, ...props }: ScrollAreaProps) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const lastTopRef = React.useRef(0);
  const emittedDirRef = React.useRef<"up" | "down" | null>(null);
  const pendingDirRef = React.useRef<"up" | "down" | null>(null);
  const pendingAccumRef = React.useRef(0);
  const lastEmitTimeRef = React.useRef(0);

  React.useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const dirRefs: DirectionRefs = {
      emittedDir: emittedDirRef,
      pendingDir: pendingDirRef,
      pendingAccum: pendingAccumRef,
      lastEmitTime: lastEmitTimeRef,
    };

    const handleScroll = () => {
      const scrolled = el.scrollTop > 0;
      setIsScrolled(scrolled);
      if (onIsScrolledChange) onIsScrolledChange(scrolled);

      if (onScrollDirectionChange) {
        const prevTop = lastTopRef.current;
        const nextTop = el.scrollTop;
        const delta = nextTop - prevTop;
        const absDelta = Math.abs(delta);
        handleScrollDirection(el, delta, absDelta, dirRefs, lastTopRef, onScrollDirectionChange);
      }
    };
    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true } as any);
    return () => {
      el.removeEventListener("scroll", handleScroll as any);
    };
  }, [onIsScrolledChange, onScrollDirectionChange]);

  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn("relative overflow-hidden", className)} {...props}>
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        ref={viewportRef}
        className="focus-visible:ring-ring/50 w-full h-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1 overflow-y-auto"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {isScrolled && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-background to-transparent" />
      )}
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none absolute",
        orientation === "vertical" && "right-0 top-0 h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" && "left-0 bottom-0 h-2.5 w-full flex-col border-t border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
