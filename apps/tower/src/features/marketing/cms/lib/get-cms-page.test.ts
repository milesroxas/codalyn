import { beforeEach, describe, expect, it, vi } from "vitest";

type CacheCall = { keyParts: string[]; options: { tags?: string[]; revalidate?: number } };
const { cacheCalls, find, getTowerLimitsSnapshot } = vi.hoisted(() => ({
  cacheCalls: [] as CacheCall[],
  find: vi.fn(),
  getTowerLimitsSnapshot: vi.fn(),
}));

vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("payload", () => ({ getPayload: vi.fn(async () => ({ find })) }));
vi.mock("@/server/billing/tower-limits-config", () => ({ getTowerLimitsSnapshot }));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown, keyParts: string[], options: CacheCall["options"]) => {
    cacheCalls.push({ keyParts, options });
    return fn;
  },
}));

import { getCmsPageBySlug } from "./get-cms-page";

const tier = (webflowProxyRequestsPerMonth: number, cmsWritesPerMonth: number, imageOptimizesPerMonth: number) => ({
  webflowProxyRequestsPerMonth,
  cmsWritesPerMonth,
  imageOptimizesPerMonth,
});

beforeEach(() => {
  cacheCalls.length = 0;
  find.mockReset();
  getTowerLimitsSnapshot.mockReset();
  getTowerLimitsSnapshot.mockResolvedValue({
    globalMeteringEnabled: true,
    envEmergencyMeteringDisabled: false,
    free: tier(2_500, 500, 25),
    pro: tier(25_000, 5_000, 500),
    studio: tier(60_000, 12_000, 1_500),
    team: tier(120_000, 25_000, 3_000),
    updatedAt: null,
  });
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

  it("resolves {{limits.*}} tokens in published pages, including nested block copy", async () => {
    find.mockResolvedValue({
      docs: [
        {
          id: 1,
          slug: "pricing",
          layout: [
            {
              blockType: "pricingPlans",
              plans: [{ name: "Pro", features: [{ text: "{{limits.pro.webflowUpdates}} Webflow updates" }] }],
            },
          ],
        },
      ],
    });
    const page = await getCmsPageBySlug("pricing", { draft: false });
    expect(page?.layout?.[0]).toMatchObject({
      plans: [{ features: [{ text: "25,000 Webflow updates" }] }],
    });
    expect(getTowerLimitsSnapshot).toHaveBeenCalledTimes(1);
  });

  it("resolves {{limits.*}} tokens in draft previews too", async () => {
    find.mockResolvedValue({
      docs: [
        { id: 2, slug: "pricing", _status: "draft", hero: { subheading: "{{limits.free.imageCredits}} credits" } },
      ],
    });
    const page = await getCmsPageBySlug("pricing", { draft: true });
    expect(page?.hero?.subheading).toBe("25 credits");
  });

  it("does not read the limits snapshot for an unknown slug", async () => {
    find.mockResolvedValue({ docs: [] });
    expect(await getCmsPageBySlug("nope", { draft: false })).toBeNull();
    expect(getTowerLimitsSnapshot).not.toHaveBeenCalled();
  });
});
