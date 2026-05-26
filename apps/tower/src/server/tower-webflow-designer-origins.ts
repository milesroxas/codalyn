/**
 * Webflow Designer extension origins — shared by CORS (`towerCorsHeadersFor`) and Better Auth
 * `trustedOrigins` (wildcard patterns supported by Better Auth).
 */
export const TOWER_WEBFLOW_DESIGNER_TRUSTED_ORIGIN_PATTERNS = [
  "https://design.webflow.com",
  "https://*.design.webflow.com",
  "https://*.webflow-ext.com",
] as const;

export function isWebflowDesignerExtensionOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "design.webflow.com" ||
      hostname.endsWith(".design.webflow.com") ||
      hostname.endsWith(".webflow-ext.com")
    );
  } catch {
    return false;
  }
}
