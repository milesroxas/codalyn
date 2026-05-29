import { describe, expect, it } from "vitest";
import {
  buildTowerUsageDesignerApiBreakdown,
  classifyWebflowProxyUsage,
  formatTowerUsageDesignerApiBreakdown,
  hasTowerUsageDesignerApiBreakdown,
} from "./webflow-proxy-usage-category.js";

describe("classifyWebflowProxyUsage", () => {
  it("classifies CMS image publish live paths as image upload", () => {
    expect(classifyWebflowProxyUsage(["collections", "abc123", "items", "def456", "live"])).toBe("imageUploadCms");
  });

  it("classifies CMS Slots collection item updates as cms slots", () => {
    expect(classifyWebflowProxyUsage(["collections", "abc123", "items", "def456"])).toBe("cmsSlots");
  });

  it("classifies site and page setup paths as cms slots", () => {
    expect(classifyWebflowProxyUsage(["sites", "site123", "pages"])).toBe("cmsSlots");
    expect(classifyWebflowProxyUsage(["pages", "page123", "custom_code"])).toBe("cmsSlots");
  });
});

describe("formatTowerUsageDesignerApiBreakdown", () => {
  it("formats non-zero categories", () => {
    const breakdown = buildTowerUsageDesignerApiBreakdown(1200, 300);
    expect(formatTowerUsageDesignerApiBreakdown(breakdown)).toBe("CMS Slots 1,200 · Image Upload 300");
  });

  it("omits zero categories", () => {
    expect(formatTowerUsageDesignerApiBreakdown(buildTowerUsageDesignerApiBreakdown(500, 0))).toBe("CMS Slots 500");
  });
});

describe("hasTowerUsageDesignerApiBreakdown", () => {
  it("returns false when breakdown is empty", () => {
    expect(hasTowerUsageDesignerApiBreakdown(buildTowerUsageDesignerApiBreakdown(0, 0))).toBe(false);
    expect(hasTowerUsageDesignerApiBreakdown(null)).toBe(false);
  });

  it("returns true when any category has usage", () => {
    expect(hasTowerUsageDesignerApiBreakdown(buildTowerUsageDesignerApiBreakdown(1, 0))).toBe(true);
  });
});
