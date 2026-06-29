import { useCallback, useLayoutEffect, useRef, useState } from "react";

export type ToolbarOverflow = {
  /** Ref for the visible toolbar row (the element whose width we fit into). */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Ref for the hidden mirror row that renders every item at full size so each one can be measured. */
  mirrorRef: React.RefObject<HTMLDivElement | null>;
  /** Ref for a hidden copy of the overflow trigger so its width is reserved before items are hidden. */
  triggerRef: React.RefObject<HTMLDivElement | null>;
  /** How many leading items currently fit; the rest belong in the overflow menu. */
  visibleCount: number;
};

const SUBPIXEL_SLACK = 0.5;

function pxValue(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Greedily counts how many leading items fit in `available` width given per-item `widths` and the row `gap`. When the
 * whole row fits, all items count and no trigger space is reserved; otherwise every kept item leaves room for the
 * `triggerWidth` the overflowed items collapse into.
 */
function fitCount(widths: readonly number[], available: number, gap: number, triggerWidth: number): number {
  const totalWithGaps = widths.reduce((sum, width, index) => sum + width + (index > 0 ? gap : 0), 0);
  if (totalWithGaps <= available + SUBPIXEL_SLACK) {
    return widths.length;
  }

  let used = 0;
  let count = 0;
  for (const width of widths) {
    const next = used + (count > 0 ? gap : 0) + width;
    if (next + gap + triggerWidth > available + SUBPIXEL_SLACK) {
      break;
    }
    used = next;
    count += 1;
  }
  return count;
}

/**
 * Priority+ overflow measurement for a single-row toolbar. A hidden mirror renders all items at full size; on mount
 * and whenever the container resizes we greedily fit leading items into the available width, reserving room for the
 * overflow trigger whenever at least one item must collapse. Measuring a separate mirror (rather than the live row)
 * keeps the result stable — hiding items never changes the widths the next measurement reads — and `useLayoutEffect`
 * commits `visibleCount` before paint, so there is no wrap-then-collapse flicker.
 *
 * In non-layout environments (jsdom) every measured width is `0`, so all items report as fitting and the toolbar
 * renders fully inline — the overflow path is browser-only.
 */
export function useToolbarOverflow(itemCount: number): ToolbarOverflow {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(itemCount);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const mirror = mirrorRef.current;
    if (!container || !mirror) {
      return;
    }

    const style = getComputedStyle(container);
    const paddingX = pxValue(style.paddingLeft) + pxValue(style.paddingRight);
    const gap = pxValue(style.columnGap || style.gap);
    const available = container.clientWidth - paddingX;

    const widths = Array.from(mirror.children, (child) => child.getBoundingClientRect().width);
    const triggerWidth = triggerRef.current?.getBoundingClientRect().width ?? 0;

    setVisibleCount(fitCount(widths, available, gap, triggerWidth));
  }, []);

  useLayoutEffect(() => {
    measure();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => measure());
    // Container: re-fit when the available width changes. Mirror: its intrinsic width tracks the item set, so adding
    // or removing features re-fits without threading the count through the effect's dependencies.
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    if (mirrorRef.current) {
      observer.observe(mirrorRef.current);
    }
    return () => observer.disconnect();
  }, [measure]);

  return { containerRef, mirrorRef, triggerRef, visibleCount };
}
