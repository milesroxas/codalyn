"use client";

import type { ReactNode } from "react";
import { useDeferredLoadingIndicator } from "./use-deferred-loading-indicator.js";

type DeferredLoadingFallbackProps = {
  children: ReactNode;
};

/** Renders children only after the standard loading-indicator delay (e.g. Suspense fallbacks). */
export function DeferredLoadingFallback(props: DeferredLoadingFallbackProps) {
  const show = useDeferredLoadingIndicator(true);
  if (!show) {
    return null;
  }
  return props.children;
}
