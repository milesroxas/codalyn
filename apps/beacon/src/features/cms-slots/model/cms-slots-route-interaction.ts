/** True while route work, surface settle, or the visible route overlay blocks the viewport. */
export function cmsSlotsRouteInteractionBlocked(input: {
  routeBlocking: boolean;
  surfaceReady: boolean;
  overlayBlocking: boolean;
}): boolean {
  return input.routeBlocking || !input.surfaceReady || input.overlayBlocking;
}

/** Drawer dismiss guard for local busy work only (route overlay handles route-level blocking). */
export function cmsSlotsDrawerDismissBlocked(...localBusy: boolean[]): boolean {
  return localBusy.some(Boolean);
}
