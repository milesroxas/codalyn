import { describe, expect, it } from "vitest";

import { resolveCmsNavLinkTarget, resolveHeaderNavItems } from "@/features/marketing/cms/lib/resolve-header-nav";
import type { Header, Page } from "@/payload-types";

const page = (overrides: Partial<Page> = {}): Page =>
  ({
    id: 1,
    title: "Pricing",
    slug: "pricing",
    updatedAt: "2026-07-13T00:00:00.000Z",
    createdAt: "2026-07-13T00:00:00.000Z",
    ...overrides,
  }) as Page;

type NavItems = NonNullable<Header["navItems"]>;

const header = (navItems: NavItems | null | undefined): Pick<Header, "navItems"> => ({ navItems });

describe("resolveCmsNavLinkTarget", () => {
  it("resolves an internal link from the populated page relation (canonical shape)", () => {
    expect(resolveCmsNavLinkTarget({ linkType: "internal", page: page(), newTab: false })).toEqual({
      href: "/pricing",
      newTab: false,
    });
  });

  it("returns null for an unpopulated internal relation (bare id at depth 0)", () => {
    expect(resolveCmsNavLinkTarget({ linkType: "internal", page: 7 })).toBeNull();
  });

  it("matches internal pages by relation, never by label-like fields", () => {
    // Only the populated relation's slug drives the href; a title alone cannot.
    expect(
      resolveCmsNavLinkTarget({ linkType: "internal", page: page({ slug: undefined as unknown as string }) })
    ).toBeNull();
    expect(
      resolveCmsNavLinkTarget({ linkType: "internal", page: page({ title: "Renamed", slug: "pricing" }) })
    ).toEqual({ href: "/pricing", newTab: false });
  });

  it("rejects internal pages with malformed slugs", () => {
    expect(resolveCmsNavLinkTarget({ linkType: "internal", page: page({ slug: "Bad Slug!" }) })).toBeNull();
  });

  it("resolves custom relative paths and absolute URLs", () => {
    expect(resolveCmsNavLinkTarget({ linkType: "custom", url: "/beacon", newTab: false })).toEqual({
      href: "/beacon",
      newTab: false,
    });
    expect(resolveCmsNavLinkTarget({ linkType: "custom", url: "https://docs.codalyn.app", newTab: true })).toEqual({
      href: "https://docs.codalyn.app",
      newTab: true,
    });
  });

  it("returns null for missing, empty, or non-URL custom values", () => {
    expect(resolveCmsNavLinkTarget({ linkType: "custom" })).toBeNull();
    expect(resolveCmsNavLinkTarget({ linkType: "custom", url: "   " })).toBeNull();
    expect(resolveCmsNavLinkTarget({ linkType: "custom", url: "javascript:alert(1)" })).toBeNull();
    expect(resolveCmsNavLinkTarget({ linkType: "custom", url: "pricing" })).toBeNull();
  });

  it("returns null for missing or malformed link groups", () => {
    expect(resolveCmsNavLinkTarget(null)).toBeNull();
    expect(resolveCmsNavLinkTarget(undefined)).toBeNull();
    expect(resolveCmsNavLinkTarget("nope" as unknown as NavItems[number]["link"])).toBeNull();
    expect(resolveCmsNavLinkTarget({ linkType: "mystery" as "custom", url: "/x" })).toBeNull();
  });
});

describe("resolveHeaderNavItems", () => {
  it("resolves link and dropdown items (canonical shape)", () => {
    const items = resolveHeaderNavItems(
      header([
        { type: "link", label: "Pricing", link: { linkType: "internal", page: page(), newTab: false } },
        {
          type: "dropdown",
          label: "Products",
          items: [
            {
              label: "Beacon",
              description: "Designer toolkit",
              link: { linkType: "custom", url: "/beacon", newTab: false },
            },
            { label: "Docs", link: { linkType: "custom", url: "https://docs.codalyn.app", newTab: true } },
          ],
        },
      ])
    );

    expect(items).toEqual([
      { type: "link", label: "Pricing", href: "/pricing", newTab: false },
      {
        type: "dropdown",
        label: "Products",
        items: [
          { label: "Beacon", href: "/beacon", newTab: false, description: "Designer toolkit" },
          { label: "Docs", href: "https://docs.codalyn.app", newTab: true, description: null },
        ],
      },
    ]);
  });

  it("returns an empty list for missing nav data", () => {
    expect(resolveHeaderNavItems(null)).toEqual([]);
    expect(resolveHeaderNavItems(undefined)).toEqual([]);
    expect(resolveHeaderNavItems(header(null))).toEqual([]);
    expect(resolveHeaderNavItems(header([]))).toEqual([]);
  });

  it("drops items with unresolvable destinations instead of partially applying them", () => {
    const items = resolveHeaderNavItems(
      header([
        { type: "link", label: "Broken", link: { linkType: "internal", page: 3 } },
        { type: "link", label: "  ", link: { linkType: "custom", url: "/ok" } },
        { type: "link", label: "Works", link: { linkType: "custom", url: "/ok" } },
      ])
    );
    expect(items).toEqual([{ type: "link", label: "Works", href: "/ok", newTab: false }]);
  });

  it("drops dropdowns whose children all fail to resolve", () => {
    const items = resolveHeaderNavItems(
      header([
        {
          type: "dropdown",
          label: "Empty",
          items: [{ label: "Broken", link: { linkType: "internal", page: 9 } }],
        },
      ])
    );
    expect(items).toEqual([]);
  });

  it("keeps only the valid children of a partially valid dropdown", () => {
    const items = resolveHeaderNavItems(
      header([
        {
          type: "dropdown",
          label: "Mixed",
          items: [
            { label: "Broken", link: { linkType: "custom", url: "" } },
            { label: "Kept", link: { linkType: "custom", url: "/kept" } },
          ],
        },
      ])
    );
    expect(items).toEqual([
      { type: "dropdown", label: "Mixed", items: [{ label: "Kept", href: "/kept", newTab: false, description: null }] },
    ]);
  });
});
