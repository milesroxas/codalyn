import type { Header } from "@/payload-types";
import { isValidTowerCmsPageSlug, towerCmsPagePath } from "@/shared/lib/navigation/tower-marketing-paths";
import type { TowerPublicNavItem, TowerPublicNavLink } from "@/shared/lib/navigation/tower-public-nav";

/**
 * Boundary normalizers for the Payload `header` global (see CLAUDE.md
 * "Runtime Value-Shape Safety Rule"): link groups arrive with the page
 * relation populated at depth > 0 but as a bare numeric id at depth 0, and
 * stored fields may carry legacy/malformed data. Invalid input resolves to
 * `null` and the item is dropped — callers decide how to degrade (the header
 * falls back to the built-in product nav when nothing resolves).
 */

type HeaderNavItem = NonNullable<Header["navItems"]>[number];
type HeaderNavDropdownLink = NonNullable<HeaderNavItem["items"]>[number];
type CmsLinkGroup = HeaderNavItem["link"];

type ResolvedLinkTarget = {
  href: string;
  newTab: boolean;
};

function readLabel(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const label = raw.trim();
  return label.length > 0 ? label : null;
}

/**
 * Resolve a link group to a concrete destination. Internal links require the
 * populated page relation (matched by id, never by label) and resolve to the
 * page's current slug; custom links require a relative path or http(s) URL.
 */
export function resolveCmsNavLinkTarget(link: CmsLinkGroup | null | undefined): ResolvedLinkTarget | null {
  if (!link || typeof link !== "object") {
    return null;
  }
  const href = link.linkType === "internal" ? resolveInternalHref(link.page) : resolveCustomHref(link);
  return href ? { href, newTab: Boolean(link.newTab) } : null;
}

function resolveInternalHref(page: NonNullable<CmsLinkGroup>["page"]): string | null {
  if (!page || typeof page === "number") {
    return null;
  }
  if (typeof page.slug !== "string" || !isValidTowerCmsPageSlug(page.slug)) {
    return null;
  }
  return towerCmsPagePath(page.slug);
}

function resolveCustomHref(link: NonNullable<CmsLinkGroup>): string | null {
  if (link.linkType !== "custom") {
    return null;
  }
  const url = typeof link.url === "string" ? link.url.trim() : "";
  if (!url || (!url.startsWith("/") && !url.startsWith("https://") && !url.startsWith("http://"))) {
    return null;
  }
  return url;
}

function resolveDropdownLink(raw: HeaderNavDropdownLink): TowerPublicNavLink | null {
  const label = readLabel(raw.label);
  const target = resolveCmsNavLinkTarget(raw.link);
  if (!label || !target) {
    return null;
  }
  const description =
    typeof raw.description === "string" && raw.description.trim().length > 0 ? raw.description.trim() : null;
  return { label, href: target.href, newTab: target.newTab, description };
}

/**
 * Resolve the header global's nav items to serializable header props. Items
 * with an unresolvable destination — and dropdowns with no valid children —
 * are dropped rather than partially applied.
 */
export function resolveHeaderNavItems(header: Pick<Header, "navItems"> | null | undefined): TowerPublicNavItem[] {
  if (!header || !Array.isArray(header.navItems)) {
    return [];
  }
  return header.navItems.map(resolveNavItem).filter((item): item is TowerPublicNavItem => item !== null);
}

function resolveNavItem(item: HeaderNavItem): TowerPublicNavItem | null {
  if (!item || typeof item !== "object") {
    return null;
  }
  const label = readLabel(item.label);
  if (!label) {
    return null;
  }

  if (item.type === "link") {
    const target = resolveCmsNavLinkTarget(item.link);
    return target ? { type: "link", label, href: target.href, newTab: target.newTab } : null;
  }

  if (item.type === "dropdown") {
    const items = (item.items ?? [])
      .map(resolveDropdownLink)
      .filter((link): link is TowerPublicNavLink => link !== null);
    return items.length > 0 ? { type: "dropdown", label, items } : null;
  }

  return null;
}
