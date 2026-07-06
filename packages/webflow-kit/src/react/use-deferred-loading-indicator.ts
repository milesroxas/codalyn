"use client";

import { useEffect, useState } from "react";
import { CODALYN_LOADING_INDICATOR_DELAY_MS } from "./loading-indicator-delay.js";

/**
 * Returns true only after `busy` has been continuously true for at least `delayMs`.
 * Clears immediately when `busy` becomes false.
 */
export function useDeferredLoadingIndicator(
  busy: boolean,
  delayMs: number = CODALYN_LOADING_INDICATOR_DELAY_MS
): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!busy) {
      setShow(false);
      return;
    }

    setShow(false);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setShow(true);
      }
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [busy, delayMs]);

  return busy && show;
}
