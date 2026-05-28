import { cn } from "@/shared/lib/utils";

/** Opacity fade-out for leaving route panel content. */
export const BEACON_ROUTE_CONTENT_EXIT_TRANSITION_MS = 180;

/** Opacity fade-in for entering route panel content. */
export const BEACON_ROUTE_CONTENT_ENTER_TRANSITION_MS = 220;

/** Delay before incoming content begins its enter (lets outgoing fade first). */
export const BEACON_ROUTE_CONTENT_ENTER_DELAY_MS = 32;

export const beaconRouteContentTransitionMotionClass = cn(
  "motion-reduce:transition-none",
  "motion-safe:transition-opacity motion-safe:duration-[180ms] motion-safe:ease-out"
);

export function beaconRouteContentVisibleClass(visible: boolean) {
  return visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0";
}
