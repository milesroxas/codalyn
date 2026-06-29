/**
 * App navigation hierarchy + the pure logic behind the header's "up" control.
 *
 * The header arrow on a flat feature route is an *Up* affordance (hierarchical), not a temporal *Back*.
 * Temporal back (`navigate(-1)`) replays every in-app jump, so hopping between two tools (e.g. Images and
 * CMS Slots) makes the arrow ping-pong through that history instead of leaving the feature. Up navigation is
 * deterministic — a flat feature's parent is always the Home hub — so it can never bounce between two screens.
 */

export const BEACON_HOME_PATH = "/home";

/**
 * The hierarchical parent of `pathname`, or `null` when the route has no parent (the Home hub itself, or any
 * route that does not surface an up control). Flat feature routes all sit one level under Home.
 *
 * Mirrors the flat-feature set in `resolveBeaconHeaderFeature` (Header.tsx): the header only renders the up
 * control for routes that resolve to a parent here.
 */
export function resolveBeaconRouteParent(pathname: string): string | null {
  if (pathname.startsWith("/cms-slots")) {
    return BEACON_HOME_PATH;
  }
  if (pathname.startsWith("/images")) {
    return BEACON_HOME_PATH;
  }
  return null;
}

/** Pop to an existing parent entry in the back stack, or push a fresh one when the stack has none. */
export type BeaconUpNavigation = { kind: "pop"; delta: number } | { kind: "push"; to: string };

/**
 * Resolve how the up control should reach `parentPath` from history index `currentIdx`.
 *
 * `entries[i]` is the pathname recorded at history index `i` (see `beacon-navigation-history`). We walk
 * backwards from the current entry and, on the nearest earlier occurrence of the parent, pop straight to it
 * (`navigate(delta)` with `delta < 0`). Popping collapses any intermediate tool-to-tool bounce in one step,
 * lands on the *existing* Home entry (preserving its scroll/state), and discards the now-irrelevant forward
 * stack. When the parent is not in the back stack (a deep link / fresh feature load), push it instead.
 */
export function resolveUpNavigation(
  entries: ReadonlyArray<string | undefined>,
  currentIdx: number,
  parentPath: string
): BeaconUpNavigation {
  for (let i = currentIdx - 1; i >= 0; i--) {
    if (entries[i] === parentPath) {
      return { kind: "pop", delta: i - currentIdx };
    }
  }
  return { kind: "push", to: parentPath };
}
