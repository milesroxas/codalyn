/**
 * Static origins for the Beacon Designer Extension, shared by Better Auth `trustedOrigins` and
 * `towerCorsHeadersFor`. Append more via
 * `TOWER_CORS_ORIGINS` / `BETTER_AUTH_TRUSTED_ORIGINS`.
 */

/** Production origins: the published Beacon extension bundle host only. */
export const TOWER_STATIC_BEACON_PRODUCTION_ORIGINS = ["https://69e2b49536eded7411b48cf6.webflow-ext.com"] as const;

/**
 * Local-development origins (Vite dev server for the extension, local Tower). Cleartext and
 * loopback, so they must never be trusted by a deployed Tower: a Vercel deployment (any
 * `VERCEL_ENV`) leaves them out, and only a machine with `VERCEL_ENV` unset admits them.
 */
export const TOWER_STATIC_BEACON_DEV_ORIGINS = [
  "http://localhost:1337",
  "http://127.0.0.1:1337",
  "http://localhost:3100",
] as const;

/** True on any Vercel deployment (production or preview); false on a developer machine. */
export function isDeployedTowerRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.VERCEL_ENV?.trim());
}

/** The static Beacon-related origins this runtime trusts: production hosts always, dev hosts only locally. */
export function resolveTowerStaticBeaconRelatedOrigins(env: NodeJS.ProcessEnv = process.env): readonly string[] {
  return isDeployedTowerRuntime(env)
    ? TOWER_STATIC_BEACON_PRODUCTION_ORIGINS
    : [...TOWER_STATIC_BEACON_DEV_ORIGINS, ...TOWER_STATIC_BEACON_PRODUCTION_ORIGINS];
}
