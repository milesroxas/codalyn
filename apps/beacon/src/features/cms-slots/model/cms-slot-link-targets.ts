/**
 * Pure helpers + types for the Composer link picker's link *targets* (site pages and CMS collection entries).
 *
 * Boundary rules (CLAUDE.md): values returned by the Webflow Designer / Data APIs are normalized here into plain
 * option records keyed by stable ids, and every non-external target resolves to a **site-relative** path. Data
 * fetching lives in the loader/hook layer; this module is pure so path/shape logic is unit-testable.
 */

import type { BeaconLinkKind } from "@/features/cms-slots/model/cms-slot-link-value";

/** A site page the user can link to. `path` is site-relative (leading `/`). */
export type LinkPickerPage = { id: string; name: string; path: string };

/** A CMS collection that has a detail/template page (so its entries are linkable). */
export type LinkPickerCollection = { id: string; name: string; templatePath: string };

/** A CMS collection entry. `path` is the site-relative detail-page path. */
export type LinkPickerEntry = { id: string; name: string; path: string };

/** Above this count a picker list shows its search input. */
export const LINK_PICKER_SEARCH_THRESHOLD = 8;

/**
 * Webflow page kinds the Page picker offers: pages with a single fixed URL. CMS collection (`cms`) pages are excluded
 * — they have no standalone URL (their `getPublishPath` resolves to whichever item is previewed), so their entries are
 * linked through the CMS tab instead. Templates and system/utility pages are excluded too.
 */
const LINKABLE_PAGE_KINDS: ReadonlySet<string> = new Set(["static", "ecommerce"]);

export function isLinkablePageKind(kind: string): boolean {
  return LINKABLE_PAGE_KINDS.has(kind);
}

/** Ensures a site-relative path: single leading slash, no trailing slash (except root), collapsed inner slashes. */
export function normalizeRelativePath(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const collapsed = withLeading.replace(/\/{2,}/g, "/");
  if (collapsed === "/") {
    return "/";
  }
  return collapsed.replace(/\/+$/, "");
}

/**
 * The CMS detail-page URL prefix for a collection, derived from a collection page's publish path by dropping the
 * trailing item-slug segment. Webflow's `Page.getPublishPath()` resolves a collection page against the item currently
 * previewed in the Designer (e.g. `/blog/the-power-of-resilience`), so the last segment is a live item slug, never
 * part of the template prefix. Returns null for a root/empty/single-segment path (no resolvable prefix).
 */
export function collectionTemplatePrefixFromPublishPath(raw: string | null | undefined): string | null {
  const norm = normalizeRelativePath(raw);
  if (norm == null || norm === "/") {
    return null;
  }
  const cut = norm.lastIndexOf("/");
  return cut <= 0 ? "/" : norm.slice(0, cut);
}

/** Joins a collection template path and an item slug into a site-relative detail path, or null if either is invalid. */
export function joinCollectionItemPath(
  templatePath: string | null | undefined,
  slug: string | null | undefined
): string | null {
  const base = normalizeRelativePath(templatePath);
  const cleanSlug = typeof slug === "string" ? slug.trim().replace(/^\/+|\/+$/g, "") : "";
  if (base == null || cleanSlug === "") {
    return null;
  }
  return normalizeRelativePath(`${base === "/" ? "" : base}/${cleanSlug}`);
}

/** Case-insensitive substring filter over an option list, matching name or path. */
export function filterLinkOptions<T extends { name: string; path: string }>(options: readonly T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (q === "") {
    return [...options];
  }
  return options.filter((o) => o.name.toLowerCase().includes(q) || o.path.toLowerCase().includes(q));
}

/** Human label for each link kind's selector segment. */
export const LINK_KIND_LABEL: Readonly<Record<BeaconLinkKind, string>> = {
  url: "URL",
  page: "Page",
  cms: "CMS item",
};
