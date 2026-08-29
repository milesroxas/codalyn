import { describe, expect, it } from "vitest";
import { CMS_CACHE_REVALIDATE_SECONDS, CMS_HEADER_CACHE_TAG, CMS_PAGES_CACHE_TAG, cmsPageCacheTag } from "./cache-tags";

describe("cms cache tags", () => {
  it("scopes page tags by slug under a stable prefix", () => {
    expect(cmsPageCacheTag("pricing")).toBe("cms:page:pricing");
    expect(cmsPageCacheTag("pricing")).not.toBe(cmsPageCacheTag("about"));
  });

  it("keeps collection-level tags distinct from per-page tags", () => {
    expect(CMS_PAGES_CACHE_TAG).not.toBe(cmsPageCacheTag("pages"));
    expect(CMS_HEADER_CACHE_TAG).not.toBe(CMS_PAGES_CACHE_TAG);
  });

  it("bounds staleness to a positive number of seconds", () => {
    expect(CMS_CACHE_REVALIDATE_SECONDS).toBeGreaterThan(0);
    expect(Number.isInteger(CMS_CACHE_REVALIDATE_SECONDS)).toBe(true);
  });
});
