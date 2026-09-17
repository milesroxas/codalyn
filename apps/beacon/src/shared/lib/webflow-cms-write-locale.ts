import { resolveLocalizedSiteCmsWritePolicy } from "@/shared/lib/beacon-release-flags";
import { readStringLikeValue } from "@/shared/lib/read-string-like-value";
import { towerFetch } from "@/shared/lib/tower-client";

/**
 * Locale handling for every CMS item write the extension performs (review round 8, 2026-09-17,
 * Localization: "Locale parameters absent from client operations … specify the intended locale on
 * every locale-aware write and never overwrite localized content with primary-locale values").
 *
 * Webflow's Data API updates CMS items in the **primary** locale unless `cmsLocaleId` is given, and
 * `GET /sites/{site_id}` exposes the site's locales (`locales.primary` / `locales.secondary`, each
 * with a `cmsLocaleId`) once Localization is enabled. The Designer Extension API exposes no "locale
 * the user is currently editing", so this module resolves the intended locale from the site itself:
 *
 * - Site without secondary locales → every write names the primary locale explicitly when the API
 *   exposes its `cmsLocaleId` (otherwise Localization is off and the endpoint is not locale-aware).
 * - Site with secondary locales → governed by `VITE_BEACON_LOCALIZED_SITE_CMS_WRITES`:
 *   `blocked` (the Marketplace build; stated in the listing) refuses the write *before any request*
 *   with an in-app explanation; `primary` writes the primary locale with its explicit `cmsLocaleId`.
 *   A secondary locale is never written.
 *
 * Boundary adaptation (`parseWebflowSiteLocales`) is separate from the decision
 * (`resolveCmsWriteLocale`) so both are pinned by unit tests with canonical, alternate, missing and
 * malformed shapes. Locales are matched by `cmsLocaleId`, never by `displayName` or `tag`.
 * @see https://developers.webflow.com/data/docs/working-with-localization
 * @see https://developers.webflow.com/data/reference/cms/collection-items/live-items/update-items-live
 */

export type WebflowSiteLocale = {
  /** CMS-side identifier — the value CMS item endpoints take as `cmsLocaleId`. */
  cmsLocaleId: string;
  /** Pages/Components-side identifier (`localeId`), when present. */
  localeId: string | null;
  /** Display-only; never used for matching. */
  displayName: string | null;
  tag: string | null;
};

export type WebflowSiteLocales = {
  primary: WebflowSiteLocale | null;
  secondary: WebflowSiteLocale[];
};

export type CmsWriteLocaleDecision =
  /** Localization off (no locale identifiers exposed): the endpoint is not locale-aware. */
  | { kind: "unscoped" }
  /** Write the primary locale, naming it explicitly. */
  | { kind: "primary"; cmsLocaleId: string }
  /** Refuse the write: the site has secondary locales and this build does not write localized sites. */
  | { kind: "blocked"; secondaryTags: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseLocale(raw: unknown): WebflowSiteLocale | null {
  if (!isRecord(raw)) {
    return null;
  }
  const cmsLocaleId = readStringLikeValue(raw.cmsLocaleId);
  if (cmsLocaleId === null) {
    return null;
  }
  return {
    cmsLocaleId,
    localeId: readStringLikeValue(raw.id),
    displayName: readStringLikeValue(raw.displayName),
    tag: readStringLikeValue(raw.tag),
  };
}

/**
 * Normalizes the `locales` block of a Get Site response. Missing block, missing `primary` or a
 * malformed entry (no string `cmsLocaleId`) → that part is absent; nothing is invented. Secondary
 * entries that fail to parse are dropped individually.
 */
export function parseWebflowSiteLocales(siteResponse: unknown): WebflowSiteLocales {
  const locales = isRecord(siteResponse) && isRecord(siteResponse.locales) ? siteResponse.locales : null;
  if (locales === null) {
    return { primary: null, secondary: [] };
  }
  const secondaryRaw = Array.isArray(locales.secondary) ? locales.secondary : [];
  return {
    primary: parseLocale(locales.primary),
    secondary: secondaryRaw.map(parseLocale).filter((locale): locale is WebflowSiteLocale => locale !== null),
  };
}

/** Pure decision over normalized locales; `policy` is the build flag. */
export function resolveCmsWriteLocale(
  locales: WebflowSiteLocales,
  policy: "blocked" | "primary" = resolveLocalizedSiteCmsWritePolicy()
): CmsWriteLocaleDecision {
  if (locales.secondary.length > 0) {
    if (policy === "blocked" || locales.primary === null) {
      return { kind: "blocked", secondaryTags: locales.secondary.map((locale) => locale.tag ?? locale.cmsLocaleId) };
    }
    return { kind: "primary", cmsLocaleId: locales.primary.cmsLocaleId };
  }
  if (locales.primary !== null) {
    return { kind: "primary", cmsLocaleId: locales.primary.cmsLocaleId };
  }
  return { kind: "unscoped" };
}

export class LocalizedSiteCmsWriteBlockedError extends Error {
  readonly secondaryTags: string[];

  constructor(secondaryTags: string[]) {
    super(LOCALIZED_SITE_CMS_WRITE_BLOCKED_MESSAGE);
    this.name = "LocalizedSiteCmsWriteBlockedError";
    this.secondaryTags = secondaryTags;
  }
}

/** User-facing copy (also the listing statement's in-app counterpart). */
export const LOCALIZED_SITE_CMS_WRITE_BLOCKED_MESSAGE =
  "This site uses Webflow Localization. Beacon does not write CMS content on localized sites yet, so nothing was changed. Edit the CMS item in Webflow instead.";

/** Throws {@link LocalizedSiteCmsWriteBlockedError} for a blocked decision; returns the decision otherwise. */
export function assertCmsWriteAllowed(
  decision: CmsWriteLocaleDecision
): Exclude<CmsWriteLocaleDecision, { kind: "blocked" }> {
  if (decision.kind === "blocked") {
    throw new LocalizedSiteCmsWriteBlockedError(decision.secondaryTags);
  }
  return decision;
}

/** Body/query fields that name the intended locale on a CMS item request (`{}` when not locale-aware). */
export function cmsLocaleRequestFields(decision: CmsWriteLocaleDecision): { cmsLocaleId?: string } {
  return decision.kind === "primary" ? { cmsLocaleId: decision.cmsLocaleId } : {};
}

const decisionsBySite = new Map<string, Promise<CmsWriteLocaleDecision>>();

async function fetchSiteLocaleDecision(siteId: string): Promise<CmsWriteLocaleDecision> {
  const res = await towerFetch(`/api/v2/webflow/sites/${encodeURIComponent(siteId)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Could not read the site's locales (${res.status}); no CMS write was made.`);
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("Could not read the site's locales (unparseable response); no CMS write was made.");
  }
  return resolveCmsWriteLocale(parseWebflowSiteLocales(data));
}

/**
 * The locale decision for the site open in the Designer, resolved from `GET /sites/{site_id}` through
 * Tower's proxy and cached per site for the session (a failed lookup is not cached, so the next write
 * retries). Every CMS item write awaits this before building its request.
 */
export async function resolveCurrentSiteCmsWriteLocale(): Promise<CmsWriteLocaleDecision> {
  const siteId = readStringLikeValue((await webflow.getSiteInfo())?.siteId);
  if (siteId === null) {
    throw new Error("Could not determine the current site; no CMS write was made.");
  }
  let pending = decisionsBySite.get(siteId);
  if (pending === undefined) {
    pending = fetchSiteLocaleDecision(siteId).catch((error: unknown) => {
      decisionsBySite.delete(siteId);
      throw error;
    });
    decisionsBySite.set(siteId, pending);
  }
  return pending;
}

/** Test seam only. */
export function resetCmsWriteLocaleCacheForTests(): void {
  decisionsBySite.clear();
}
