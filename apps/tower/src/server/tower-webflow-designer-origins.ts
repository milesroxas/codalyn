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
    const { protocol, hostname } = new URL(origin);
    // Webflow Designer + extension origins are always https; reject scheme downgrades (http://…)
    // so a matching hostname over http can't be treated as trusted (defense in depth for CORS +
    // the Beacon postMessage handoff).
    if (protocol !== "https:") {
      return false;
    }
    return (
      hostname === "design.webflow.com" ||
      hostname.endsWith(".design.webflow.com") ||
      hostname.endsWith(".webflow-ext.com")
    );
  } catch {
    return false;
  }
}
