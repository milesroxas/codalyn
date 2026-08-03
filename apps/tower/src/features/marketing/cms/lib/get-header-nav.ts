import config from "@payload-config";
import { getPayload } from "payload";
import { cache } from "react";

import { resolveHeaderNavItems } from "@/features/marketing/cms/lib/resolve-header-nav";
import { resolveTowerPublicMarketingHref } from "@/server/tower-hosts";
import type { TowerPublicNavItem, TowerPublicNavLink } from "@/shared/lib/navigation/tower-public-nav";

const findHeaderGlobal = cache(async () => {
  const payload = await getPayload({ config });
  return payload.findGlobal({ slug: "header", depth: 1, overrideAccess: false });
});

function toHostAwareLink(link: TowerPublicNavLink, hostname: string): TowerPublicNavLink {
  return { ...link, href: toHostAwareHref(link.href, hostname) };
}

function toHostAwareHref(href: string, hostname: string): string {
  return href.startsWith("/") ? resolveTowerPublicMarketingHref(href, hostname) : href;
}

/**
 * Fetch the CMS-managed header navigation for the public header, resolved for
 * the requesting host (marketing paths become absolute marketing-origin URLs
 * on the app host when the host split is enabled). Returns `null` when the
 * header global has no usable nav items or the CMS is unreachable — callers
 * fall back to the built-in product nav.
 */
export const getTowerHeaderNavItems = cache(async (hostname: string): Promise<TowerPublicNavItem[] | null> => {
  let items: TowerPublicNavItem[];
  try {
    items = resolveHeaderNavItems(await findHeaderGlobal());
  } catch (error) {
    console.error("[cms] failed to load header nav, falling back to built-in nav", error);
    return null;
  }
  if (items.length === 0) {
    return null;
  }

  return items.map((item) =>
    item.type === "link"
      ? { ...item, href: toHostAwareHref(item.href, hostname) }
      : { ...item, items: item.items.map((link) => toHostAwareLink(link, hostname)) }
  );
});
