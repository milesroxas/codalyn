import type { TransitionEvent } from "react";

import { cn } from "@/shared/lib/utils";

const stepTransitionMotionClass = cn(
  "motion-reduce:transition-none motion-reduce:transform-none",
  "motion-safe:transition-[opacity,transform] motion-safe:duration-[280ms] motion-safe:ease-[cubic-bezier(0.32,0.72,0,1)]"
);

/** Leaving step content — fades up slightly. */
export function imageEditorStepExitTransitionClass(exiting: boolean) {
  return cn(
    "flex min-w-0 flex-col",
    stepTransitionMotionClass,
    exiting
      ? "pointer-events-none motion-safe:-translate-y-1 motion-safe:opacity-0"
      : "motion-safe:translate-y-0 motion-safe:opacity-100"
  );
}

/** Entering step content — rises into place after mount. */
export function imageEditorStepEnterTransitionClass(entered: boolean) {
  return cn(
    "flex min-w-0 flex-col",
    stepTransitionMotionClass,
    entered ? "motion-safe:translate-y-0 motion-safe:opacity-100" : "motion-safe:translate-y-1 motion-safe:opacity-0"
  );
}

/** Only complete step exit when the wrapper’s opacity transition finishes. */
export function isImageEditorStepExitTransitionEnd(e: TransitionEvent<HTMLDivElement>, exiting: boolean): boolean {
  return exiting && e.target === e.currentTarget && e.propertyName === "opacity";
}
