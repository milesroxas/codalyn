import { deriveMarketingOriginFromTowerAppUrl } from "@/shared/lib/tower-hosts/derive-marketing-origin-from-app";

const DEFAULT_MARKETING_ORIGIN = "https://codalyn.app";

function normalizeHostname(host: string): string {
  return host.replace(/:\d+$/, "").toLowerCase();
}

function isLocalDevHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return normalized === "localhost" || normalized === "127.0.0.1";
}

function isTowerAppSubdomain(hostname: string): boolean {
  return /^tower[.-]/.test(normalizeHostname(hostname));
}

function readConfiguredMarketingOrigin(): string | null {
  const explicit = process.env.NEXT_PUBLIC_TOWER_MARKETING_URL?.trim() || process.env.TOWER_MARKETING_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return deriveMarketingOriginFromTowerAppUrl(appUrl);
  }
  return null;
}

function isHostSplitEnabled(): boolean {
  if (process.env.TOWER_HOST_SPLIT === "0" || process.env.TOWER_HOST_SPLIT === "false") {
    return false;
  }
  if (process.env.TOWER_HOST_SPLIT === "1" || process.env.TOWER_HOST_SPLIT === "true") {
    return true;
  }
  if (process.env.TOWER_MARKETING_HOSTS || process.env.TOWER_APP_HOST || process.env.TOWER_MARKETING_URL) {
    return true;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    return false;
  }
  try {
    return isTowerAppSubdomain(new URL(appUrl).hostname);
  } catch {
    return false;
  }
}

function resolveAppHost(): string | null {
  const fromEnv = process.env.TOWER_APP_HOST?.trim();
  if (fromEnv) {
    return normalizeHostname(fromEnv);
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    return null;
  }
  try {
    return normalizeHostname(new URL(appUrl).hostname);
  } catch {
    return null;
  }
}

function isAppHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (isLocalDevHost(normalized)) {
    return true;
  }
  if (!isHostSplitEnabled()) {
    return true;
  }
  const appHost = resolveAppHost();
  if (appHost) {
    return normalized === appHost;
  }
  return isTowerAppSubdomain(normalized);
}

export function resolveTowerMarketingOrigin(): string {
  return readConfiguredMarketingOrigin() ?? DEFAULT_MARKETING_ORIGIN;
}

/**
 * Where to send the user after signing out of Tower on the web.
 * On the app host with marketing/app split, returns the marketing site origin (absolute URL).
 * On localhost or unified hosts, returns `/` for same-origin navigation.
 */
export function resolveTowerPostSignOutUrl(options?: { hostname?: string }): string {
  const hostname = options?.hostname ?? (typeof window !== "undefined" ? window.location.hostname : undefined);

  if (!hostname || isLocalDevHost(hostname) || !isHostSplitEnabled() || !isAppHost(hostname)) {
    return "/";
  }

  return `${resolveTowerMarketingOrigin()}/`;
}

export function isTowerPostSignOutExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}
