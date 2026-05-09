export function isCmsSlotsSurfaceEnabled(): boolean {
  const v = import.meta.env.VITE_CMS_SLOTS_SURFACE_ENABLED?.trim();
  if (import.meta.env.PROD) {
    return v === "true";
  }
  return v !== "false";
}
