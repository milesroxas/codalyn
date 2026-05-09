export function isCmsSlotsSurfaceEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_CMS_SLOTS_SURFACE_ENABLED?.trim();
  if (process.env.NODE_ENV === "production") {
    return v === "true";
  }
  return v !== "false";
}
