/**
 * Static origins for Beacon Designer + local Tower dev, shared by Better Auth `trustedOrigins`
 * and `towerCorsHeadersFor`. Append more via `TOWER_CORS_ORIGINS` / `BETTER_AUTH_TRUSTED_ORIGINS`.
 */
export const TOWER_STATIC_BEACON_RELATED_ORIGINS = [
  "http://localhost:1337",
  "http://127.0.0.1:1337",
  "http://localhost:3100",
  "https://69e2b49536eded7411b48cf6.webflow-ext.com",
] as const;
