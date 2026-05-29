/** Radix tooltip collision inset — keeps usage meter popovers inside the viewport. */
export const USAGE_METER_TOOLTIP_COLLISION_PADDING = 12;

/**
 * Responsive cap for usage meter tooltip shells (`TooltipContent` / Radix `Content`).
 * `68ch` targets ~65–75 characters per line (typographic measure for `text-xs` body copy).
 * Prefer this on the tooltip surface, not on inner detail markup.
 */
export const usageMeterTooltipMaxWidthClass = "max-w-[min(68ch,calc(100vw-2rem))]";
