import { beforeEach, describe, expect, it, vi } from "vitest";

type CacheCall = { keyParts: string[]; options: { tags?: string[]; revalidate?: number } };
// The module under test registers its cache entry at import time, so the mock state must be hoisted.
const { cacheCalls, findGlobal } = vi.hoisted(() => ({
  cacheCalls: [] as CacheCall[],
  findGlobal: vi.fn(),
}));

vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("payload", () => ({ getPayload: vi.fn(async () => ({ findGlobal })) }));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown, keyParts: string[], options: CacheCall["options"]) => {
    cacheCalls.push({ keyParts, options });
    return fn;
  },
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}));
vi.mock("@/server/tower-hosts", () => ({
  resolveTowerPublicMarketingHref: (href: string) => href,
}));

import { getTowerHeaderNavItems } from "./get-header-nav";

beforeEach(() => {
  findGlobal.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getTowerHeaderNavItems", () => {
  it("registers the header read in the Data Cache under the header tag", () => {
    expect(cacheCalls).toHaveLength(1);
    expect(cacheCalls[0].keyParts).toEqual(["cms-header-global"]);
    expect(cacheCalls[0].options.tags).toEqual(["cms:header"]);
    expect(cacheCalls[0].options.revalidate).toBeGreaterThan(0);
  });

  it("resolves nav items from the header global", async () => {
    findGlobal.mockResolvedValue({
      navItems: [{ type: "link", label: "Pricing", link: { linkType: "custom", url: "/pricing" } }],
    });
    const items = await getTowerHeaderNavItems("codalyn.app");
    expect(findGlobal).toHaveBeenCalledWith(expect.objectContaining({ slug: "header", overrideAccess: false }));
    expect(items).toHaveLength(1);
    expect(items?.[0]).toEqual(expect.objectContaining({ type: "link", label: "Pricing", href: "/pricing" }));
  });

  it("falls back to null when the CMS is unreachable", async () => {
    findGlobal.mockRejectedValue(new Error("cannot connect to Postgres"));
    expect(await getTowerHeaderNavItems("codalyn.app")).toBeNull();
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});
