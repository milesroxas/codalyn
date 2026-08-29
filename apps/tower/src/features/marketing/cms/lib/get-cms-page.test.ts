import { beforeEach, describe, expect, it, vi } from "vitest";

type CacheCall = { keyParts: string[]; options: { tags?: string[]; revalidate?: number } };
const { cacheCalls, find } = vi.hoisted(() => ({
  cacheCalls: [] as CacheCall[],
  find: vi.fn(),
}));

vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("payload", () => ({ getPayload: vi.fn(async () => ({ find })) }));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown, keyParts: string[], options: CacheCall["options"]) => {
    cacheCalls.push({ keyParts, options });
    return fn;
  },
}));

import { getCmsPageBySlug } from "./get-cms-page";

beforeEach(() => {
  cacheCalls.length = 0;
  find.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getCmsPageBySlug", () => {
  it("rejects invalid slugs without touching the CMS", async () => {
    expect(await getCmsPageBySlug("../etc", { draft: false })).toBeNull();
    expect(find).not.toHaveBeenCalled();
    expect(cacheCalls).toHaveLength(0);
  });

  it("caches published reads per slug under the pages + page tags", async () => {
    find.mockResolvedValue({ docs: [{ id: 1, slug: "pricing" }] });
    const page = await getCmsPageBySlug("pricing", { draft: false });
    expect(page).toEqual({ id: 1, slug: "pricing" });
    expect(cacheCalls).toHaveLength(1);
    expect(cacheCalls[0].keyParts).toEqual(["cms-page-by-slug", "pricing"]);
    expect(cacheCalls[0].options.tags).toEqual(["cms:pages", "cms:page:pricing"]);
    expect(cacheCalls[0].options.revalidate).toBeGreaterThan(0);
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ draft: false, overrideAccess: false }));
  });

  it("returns null (cacheable) for an unknown published slug", async () => {
    find.mockResolvedValue({ docs: [] });
    expect(await getCmsPageBySlug("nope", { draft: false })).toBeNull();
  });

  it("degrades to null when the CMS is unreachable on a published read", async () => {
    find.mockRejectedValue(new Error("cannot connect to Postgres"));
    expect(await getCmsPageBySlug("pricing", { draft: false })).toBeNull();
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("reads drafts live, uncached, with access override, and lets errors surface", async () => {
    find.mockResolvedValue({ docs: [{ id: 2, slug: "pricing", _status: "draft" }] });
    expect(await getCmsPageBySlug("pricing", { draft: true })).toEqual({ id: 2, slug: "pricing", _status: "draft" });
    expect(cacheCalls).toHaveLength(0);
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ draft: true, overrideAccess: true }));

    find.mockRejectedValue(new Error("boom"));
    await expect(getCmsPageBySlug("pricing", { draft: true })).rejects.toThrow("boom");
  });
});
