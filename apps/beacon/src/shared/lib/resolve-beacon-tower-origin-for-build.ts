/** Default Tower app origin for production Webflow bundles (not the marketing site). */
export const DEFAULT_PRODUCTION_TOWER_ORIGIN = "https://tower.codalyn.app";

/** Marketing-only hosts — API/auth must use the Tower app subdomain instead. */
const TOWER_MARKETING_ONLY_HOSTS = ["codalyn.app", "www.codalyn.app", "preview.codalyn.app"] as const;

export type ResolveBeaconTowerOriginForBuildOptions = {
  mode: string;
  explicitOrigin?: string;
  allowLocalInProduction?: boolean;
  towerPort?: string;
  towerDevHost?: string;
};

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, "");
}

function hostnameFromOrigin(origin: string): string | null {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isLocalTowerOrigin(origin: string): boolean {
  const hostname = hostnameFromOrigin(origin);
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function isTowerMarketingOnlyHost(hostname: string): boolean {
  return (TOWER_MARKETING_ONLY_HOSTS as readonly string[]).includes(hostname.toLowerCase());
}

/**
 * Tower base URL baked into the Beacon bundle at build time.
 * Production defaults to the Tower app host (`tower.codalyn.app`), never the marketing domain.
 */
export function resolveBeaconTowerOriginForBuild(options: ResolveBeaconTowerOriginForBuildOptions): string {
  const {
    mode,
    explicitOrigin = "",
    allowLocalInProduction = false,
    towerPort = "3100",
    towerDevHost = "localhost",
  } = options;

  const explicit = normalizeOrigin(explicitOrigin);
  if (explicit) {
    if (mode === "production") {
      const hostname = hostnameFromOrigin(explicit);
      if (hostname && isTowerMarketingOnlyHost(hostname)) {
        return normalizeOrigin(DEFAULT_PRODUCTION_TOWER_ORIGIN);
      }
      if (isLocalTowerOrigin(explicit) && !allowLocalInProduction) {
        return normalizeOrigin(DEFAULT_PRODUCTION_TOWER_ORIGIN);
      }
    }
    return explicit;
  }

  if (mode === "production") {
    return normalizeOrigin(DEFAULT_PRODUCTION_TOWER_ORIGIN);
  }

  return `http://${towerDevHost}:${towerPort}`;
}
