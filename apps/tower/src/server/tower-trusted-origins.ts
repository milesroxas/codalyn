import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { TOWER_STATIC_BEACON_RELATED_ORIGINS } from "@/server/tower-static-beacon-origins";

/** Canonical Tower staging origin (Preview env only). Override with TOWER_PREVIEW_APP_ORIGIN. */
const DEFAULT_PREVIEW_APP_ORIGIN = "https://tower-preview.codalyn.app";

function parseCommaSeparatedOrigins(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toHttpsOrigin(hostOrUrl: string): string {
  const host = hostOrUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${host}`;
}

function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/$/, "");
}

/**
 * Preview-only origins: explicit staging host + server-controlled Vercel deployment URLs.
 * Never use `*.codalyn.app` or `*.vercel.app` — production cookies are scoped to `.codalyn.app`
 * and broad wildcards would allow cross-environment CSRF (e.g. staging XSS → prod auth).
 */
function resolvePreviewTrustedOrigins(): string[] {
  if (process.env.VERCEL_ENV !== "preview") {
    return [];
  }

  const origins: string[] = [];
  const previewAppOrigin = normalizeOrigin(process.env.TOWER_PREVIEW_APP_ORIGIN ?? DEFAULT_PREVIEW_APP_ORIGIN);
  if (previewAppOrigin) {
    origins.push(previewAppOrigin);
  }

  for (const key of ["VERCEL_URL", "VERCEL_BRANCH_URL"] as const) {
    const raw = process.env[key]?.trim();
    if (raw) {
      origins.push(toHttpsOrigin(raw));
    }
  }

  return origins;
}

export function resolveTowerTrustedOrigins(): string[] {
  const baseURL = resolveTowerPublicBaseUrl();
  const fromEnv = parseCommaSeparatedOrigins(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? process.env.TOWER_CORS_ORIGINS);
  return [...new Set([baseURL, ...TOWER_STATIC_BEACON_RELATED_ORIGINS, ...fromEnv, ...resolvePreviewTrustedOrigins()])];
}
