import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";
import { deriveMarketingOriginFromTowerAppUrl } from "@/shared/lib/tower-hosts/derive-marketing-origin-from-app";

export { sanitizeRelativePath };

const DEFAULT_MARKETING_HOSTS = ["codalyn.app", "www.codalyn.app"] as const;
const DEFAULT_FLINT_MARKETING_HOSTS = ["flint.codalyn.app"] as const;
const DEFAULT_APP_HOST = "tower.codalyn.app";
const DEFAULT_MARKETING_ORIGIN = "https://codalyn.app";

type TowerHostConfig = {
  splitEnabled: boolean;
  marketingHosts: ReadonlySet<string>;
  flintMarketingHosts: ReadonlySet<string>;
  appHost: string;
  marketingOrigin: string;
  flintMarketingOrigin: string;
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
    process.env.TOWER_FLINT_MARKETING_HOSTS,
    process.env.TOWER_FLINT_MARKETING_URL,
    process.env.TOWER_APP_HOST,
    process.env.TOWER_MARKETING_URL,
    process.env.TOWER_COOKIE_DOMAIN,
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_ENV,
  ].join("|");
}

function deriveMarketingHostFromTowerAppUrl(appUrl: string): string | null {
  try {
    const { hostname } = new URL(appUrl.trim());
    const host = normalizeHostname(hostname);
    if (host.startsWith("tower.")) {
      return host.slice("tower.".length);
    }
    if (host.startsWith("tower-")) {
      return host.slice("tower-".length);
    }
  } catch {
    return null;
  }
  return null;
}

function parseMarketingHosts(appUrl: string): readonly string[] {
  const fromEnv = process.env.TOWER_MARKETING_HOSTS?.split(",")
    .map((entry) => normalizeHostname(entry.trim()))
    .filter(Boolean);
  if (fromEnv?.length) {
    return fromEnv;
  }
  const derived = deriveMarketingHostFromTowerAppUrl(appUrl);
  return derived ? [derived, ...DEFAULT_MARKETING_HOSTS] : DEFAULT_MARKETING_HOSTS;
}

function deriveFlintMarketingHostFromTowerAppUrl(appUrl: string): string | null {
  try {
    const { hostname } = new URL(appUrl.trim());
    const host = normalizeHostname(hostname);
    if (host.startsWith("tower.")) {
      return `flint.${host.slice("tower.".length)}`;
    }
    if (host.startsWith("tower-")) {
      return `flint-${host.slice("tower-".length)}`;
    }
  } catch {
    return null;
  }
  return null;
}

function parseFlintMarketingHosts(appUrl: string): readonly string[] {
  const fromEnv = process.env.TOWER_FLINT_MARKETING_HOSTS?.split(",")
    .map((entry) => normalizeHostname(entry.trim()))
    .filter(Boolean);
  if (fromEnv?.length) {
    return fromEnv;
  }
  const derived = deriveFlintMarketingHostFromTowerAppUrl(appUrl);
  return derived ? [derived, ...DEFAULT_FLINT_MARKETING_HOSTS] : DEFAULT_FLINT_MARKETING_HOSTS;
}

function resolveFlintMarketingOriginFromEnv(appUrl: string): string {
  const explicit = process.env.TOWER_FLINT_MARKETING_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const derivedHost = deriveFlintMarketingHostFromTowerAppUrl(appUrl);
  if (derivedHost) {
    try {
      const { protocol } = new URL(appUrl.trim());
      return `${protocol}//${derivedHost}`;
    } catch {
      return `https://${derivedHost}`;
    }
  }
  return "https://flint.codalyn.app";
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
  const appOrigin = resolveTowerPublicBaseUrl();
  return {
    splitEnabled,
    marketingHosts: new Set(parseMarketingHosts(appOrigin)),
    flintMarketingHosts: new Set(parseFlintMarketingHosts(appOrigin)),
    appHost,
    marketingOrigin: resolveMarketingOriginFromEnv(),
    flintMarketingOrigin: resolveFlintMarketingOriginFromEnv(appOrigin),
    appOrigin,
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

export function isFlintMarketingHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (isLocalDevHost(normalized)) {
    return false;
  }
  return getTowerHostConfig().flintMarketingHosts.has(normalized);
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

export function buildFlintMarketingUrl(pathname: string, search = ""): string {
  return joinOriginPath(getTowerHostConfig().flintMarketingOrigin, pathname, search);
}

/** Marketing homepage — same-origin on the marketing host, absolute on the app host when split. */
export function resolveTowerPublicHomeHref(hostname: string): string {
  const normalized = normalizeHostname(hostname);
  if (normalized && isMarketingHost(normalized)) {
    return "/";
  }
  if (isHostSplitEnabled() && normalized && isAppHost(normalized)) {
    return buildMarketingUrl("/");
  }
  return "/";
}

/** Product marketing page for Tower — `/tower` on marketing/unified hosts, marketing origin when split on the app host. */
export function resolveTowerPublicTowerHref(hostname: string): string {
  const normalized = normalizeHostname(hostname);
  if (isHostSplitEnabled()) {
    if (normalized && isMarketingHost(normalized)) {
      return "/tower";
    }
    return buildMarketingUrl("/tower");
  }
  return "/tower";
}

/** Product marketing page for Beacon — same-origin on the marketing host, absolute on the app host when split. */
export function resolveTowerPublicBeaconHref(hostname: string): string {
  const normalized = normalizeHostname(hostname);
  if (normalized && isMarketingHost(normalized)) {
    return "/beacon";
  }
  if (isHostSplitEnabled()) {
    return buildMarketingUrl("/beacon");
  }
  return "/beacon";
}

export function shouldServeBeaconMarketingPage(hostname: string, signedIn: boolean): boolean {
  if (isMarketingHost(hostname)) {
    return true;
  }
  if (isHostSplitEnabled()) {
    return false;
  }
  return !signedIn;
}

/** Product marketing page for Flint — same-origin on marketing hosts, absolute on the app host when split. */
export function resolveTowerPublicFlintHref(hostname: string): string {
  const normalized = normalizeHostname(hostname);
  if (normalized && isFlintMarketingHost(normalized)) {
    return "/";
  }
  if (normalized && isMarketingHost(normalized)) {
    return "/flint";
  }
  if (isHostSplitEnabled()) {
    return buildMarketingUrl("/flint");
  }
  return "/flint";
}

export function buildTowerLandingAppLinks(hostname?: string): {
  home: string;
  signIn: string;
  signUp: string;
  requestAccess: string;
  tower: string;
  beacon: string;
  flint: string;
} {
  const resolvedHost = hostname ? normalizeHostname(hostname) : "";
  return {
    home: resolveTowerPublicHomeHref(resolvedHost),
    signIn: buildTowerAppUrl("/sign-in"),
    signUp: buildTowerAppUrl("/sign-up"),
    requestAccess: buildTowerAppUrl("/request-access"),
    tower: resolveTowerPublicTowerHref(resolvedHost),
    beacon: resolveTowerPublicBeaconHref(resolvedHost),
    flint: resolveTowerPublicFlintHref(resolvedHost),
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
