import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";
import { deriveMarketingOriginFromTowerAppUrl } from "@/shared/lib/tower-hosts/derive-marketing-origin-from-app";

export { sanitizeRelativePath };

const DEFAULT_MARKETING_HOSTS = ["codalyn.app", "www.codalyn.app"] as const;
const DEFAULT_APP_HOST = "tower.codalyn.app";
const DEFAULT_MARKETING_ORIGIN = "https://codalyn.app";

type TowerHostConfig = {
  splitEnabled: boolean;
  marketingHosts: ReadonlySet<string>;
  appHost: string;
  marketingOrigin: string;
  appOrigin: string;
  cookieDomain: string | undefined;
};

let cachedConfig: TowerHostConfig | null = null;
let cachedConfigKey: string | null = null;

/** Strip port and lowercase for host comparisons. */
export function normalizeHostname(host: string): string {
  return host.replace(/:\d+$/, "").toLowerCase();
}

function isLocalDevHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function envConfigKey(): string {
  return [
    process.env.TOWER_HOST_SPLIT,
    process.env.TOWER_MARKETING_HOSTS,
    process.env.TOWER_APP_HOST,
    process.env.TOWER_MARKETING_URL,
    process.env.TOWER_COOKIE_DOMAIN,
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_ENV,
  ].join("|");
}

function parseMarketingHosts(): readonly string[] {
  const fromEnv = process.env.TOWER_MARKETING_HOSTS?.split(",")
    .map((entry) => normalizeHostname(entry.trim()))
    .filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_MARKETING_HOSTS;
}

function resolveAppHostFromEnv(): string {
  const fromEnv = process.env.TOWER_APP_HOST?.trim();
  if (fromEnv) {
    return normalizeHostname(fromEnv);
  }
  try {
    return normalizeHostname(new URL(resolveTowerPublicBaseUrl()).hostname);
  } catch {
    return DEFAULT_APP_HOST;
  }
}

function resolveMarketingOriginFromEnv(): string {
  const explicit = process.env.TOWER_MARKETING_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const derived = deriveMarketingOriginFromTowerAppUrl(resolveTowerPublicBaseUrl());
  if (derived) {
    return derived;
  }
  return DEFAULT_MARKETING_ORIGIN;
}

function isTowerAppSubdomain(hostname: string): boolean {
  return /^tower[.-]/.test(normalizeHostname(hostname));
}

function resolveSplitEnabledFromEnv(): boolean {
  if (process.env.TOWER_HOST_SPLIT === "0" || process.env.TOWER_HOST_SPLIT === "false") {
    return false;
  }
  if (process.env.TOWER_HOST_SPLIT === "1" || process.env.TOWER_HOST_SPLIT === "true") {
    return true;
  }
  if (process.env.TOWER_MARKETING_HOSTS || process.env.TOWER_APP_HOST || process.env.TOWER_MARKETING_URL) {
    return true;
  }
  try {
    const hostname = normalizeHostname(new URL(resolveTowerPublicBaseUrl()).hostname);
    return isTowerAppSubdomain(hostname);
  } catch {
    return false;
  }
}

/** Derive registrable parent domain (e.g. tower.codalyn.app → codalyn.app). */
export function parentDomainForCookie(hostname: string): string | null {
  const normalized = normalizeHostname(hostname);
  const parts = normalized.split(".").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }
  return parts.slice(-2).join(".");
}

function resolveCookieDomainFromEnv(appHost: string, splitEnabled: boolean): string | undefined {
  const vercelEnv = process.env.VERCEL_ENV;
  if (!splitEnabled || (vercelEnv !== "production" && vercelEnv !== "preview")) {
    return undefined;
  }
  const expectedParent = parentDomainForCookie(appHost);
  if (!expectedParent) {
    return undefined;
  }
  const explicit = process.env.TOWER_COOKIE_DOMAIN?.trim().replace(/^\./, "");
  const domain = explicit ?? expectedParent;
  if (domain !== expectedParent) {
    return undefined;
  }
  if (!appHost.endsWith(domain)) {
    return undefined;
  }
  return domain;
}

function buildTowerHostConfig(): TowerHostConfig {
  const splitEnabled = resolveSplitEnabledFromEnv();
  const appHost = resolveAppHostFromEnv();
  return {
    splitEnabled,
    marketingHosts: new Set(parseMarketingHosts()),
    appHost,
    marketingOrigin: resolveMarketingOriginFromEnv(),
    appOrigin: resolveTowerPublicBaseUrl(),
    cookieDomain: resolveCookieDomainFromEnv(appHost, splitEnabled),
  };
}

function getTowerHostConfig(): TowerHostConfig {
  const key = envConfigKey();
  if (cachedConfig && cachedConfigKey === key) {
    return cachedConfig;
  }
  cachedConfigKey = key;
  cachedConfig = buildTowerHostConfig();
  return cachedConfig;
}

function joinOriginPath(origin: string, pathname: string, search = ""): string {
  return `${origin.replace(/\/$/, "")}${sanitizeRelativePath(pathname, search)}`;
}

export function resolveMarketingHosts(): readonly string[] {
  return [...getTowerHostConfig().marketingHosts];
}

export function resolveAppHost(): string {
  return getTowerHostConfig().appHost;
}

export function resolveMarketingOrigin(): string {
  return getTowerHostConfig().marketingOrigin;
}

export function isHostSplitEnabled(): boolean {
  return getTowerHostConfig().splitEnabled;
}

export function isMarketingHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (isLocalDevHost(normalized)) {
    return false;
  }
  return getTowerHostConfig().marketingHosts.has(normalized);
}

export function isAppHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (isLocalDevHost(normalized)) {
    return true;
  }
  const config = getTowerHostConfig();
  if (!config.splitEnabled) {
    return true;
  }
  return normalized === config.appHost;
}

export function buildTowerAppUrl(pathname: string, search = ""): string {
  return joinOriginPath(getTowerHostConfig().appOrigin, pathname, search);
}

export function buildMarketingUrl(pathname: string, search = ""): string {
  return joinOriginPath(getTowerHostConfig().marketingOrigin, pathname, search);
}

export function buildTowerLandingAppLinks(): {
  signIn: string;
  signUp: string;
  requestAccess: string;
} {
  return {
    signIn: buildTowerAppUrl("/sign-in"),
    signUp: buildTowerAppUrl("/sign-up"),
    requestAccess: buildTowerAppUrl("/request-access"),
  };
}

/** Parent domain for shared session cookies across codalyn.app and tower.codalyn.app (production only). */
export function resolveTowerCookieDomain(): string | undefined {
  return getTowerHostConfig().cookieDomain;
}

/** Reset module cache — tests only. */
export function resetTowerHostConfigCacheForTests(): void {
  cachedConfig = null;
  cachedConfigKey = null;
}
