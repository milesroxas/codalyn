/**
 * Full-height flex column for Beacon routes in the Designer extension iframe.
 * Use for the routed shell, settings, and any surface that should pin chrome (e.g. dock footer) to the viewport edges.
 */
export const beaconAppRouteSurfaceClass = "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden";

/**
 * Width containment for any panel region inside the fixed-size Designer extension iframe.
 * Pair with `overflow-x-clip` on scroll surfaces; children inherit a bounded width without per-section max-width hacks.
 */
export const beaconPanelContainClass = "min-w-0 w-full max-w-full";

/** Horizontal inset shared by route scroll content, footers, and full-bleed chrome strips. */
export const beaconAppHorizontalInsetClass = "px-3";

/** Padded, scrollable route body content (horizontal inset matches route chrome padding). */
export const beaconRouteScrollContentClass = `box-border min-w-0 w-full max-w-full space-y-4 overflow-x-clip py-3 ${beaconAppHorizontalInsetClass}`;

/** Stretch scroll content to the viewport so flex-1 route loaders fill available height. */
export const beaconRouteScrollViewportFillClass = "flex min-h-full min-w-0 flex-col";

/** Full-bleed strip inside padded scroll content (e.g. loaded-image filename bar). */
export const beaconRouteBleedXClass = "-mx-3 px-3";
