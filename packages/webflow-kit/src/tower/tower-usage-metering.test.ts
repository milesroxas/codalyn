import { describe, expect, it } from "vitest";
import {
  buildTowerUsageMeterSnapshot,
  classifyUsageMeter,
  normalizeTowerUsageMeterKind,
  parseTowerUsageLimitBody,
  pickApproachingUsageMeters,
  TOWER_USAGE_APPROACHING_LIMIT_RATIO,
} from "./tower-usage-metering.js";

describe("classifyUsageMeter", () => {
  it("treats null limit as unmetered", () => {
    expect(classifyUsageMeter(100, null)).toBe("unmetered");
  });

  it("flags approaching at 80% threshold", () => {
    expect(classifyUsageMeter(79, 100)).toBe("ok");
    expect(classifyUsageMeter(80, 100)).toBe("approaching");
    expect(classifyUsageMeter(99, 100)).toBe("approaching");
  });

  it("flags exceeded at cap", () => {
    expect(classifyUsageMeter(100, 100)).toBe("exceeded");
  });
});

describe("pickApproachingUsageMeters", () => {
  it("returns only approaching meters", () => {
    const meters = [
      buildTowerUsageMeterSnapshot("webflowProxy", 10, 100),
      buildTowerUsageMeterSnapshot("cmsWrite", 80, 100),
      buildTowerUsageMeterSnapshot("image", 100, 100),
    ];
    const approaching = pickApproachingUsageMeters(meters);
    expect(approaching).toHaveLength(1);
    expect(approaching[0]?.kind).toBe("cmsWrite");
  });
});

describe("parseTowerUsageLimitBody", () => {
  it("parses current meter kinds", () => {
    const parsed = parseTowerUsageLimitBody(
      JSON.stringify({
        code: "TOWER_USAGE_LIMIT",
        kind: "webflowProxy",
        used: 2500,
        limit: 2500,
      })
    );
    expect(parsed).toEqual({ kind: "webflowProxy", used: 2500, limit: 2500 });
  });

  it("normalizes legacy webflow kind to webflowProxy", () => {
    const parsed = parseTowerUsageLimitBody(
      JSON.stringify({
        code: "TOWER_USAGE_LIMIT",
        kind: "webflow",
        used: 1,
        limit: 10,
      })
    );
    expect(parsed?.kind).toBe("webflowProxy");
  });
});

describe("TOWER_USAGE_APPROACHING_LIMIT_RATIO", () => {
  it("is 0.8", () => {
    expect(TOWER_USAGE_APPROACHING_LIMIT_RATIO).toBe(0.8);
  });
});

describe("normalizeTowerUsageMeterKind", () => {
  it("accepts cmsWrite and image", () => {
    expect(normalizeTowerUsageMeterKind("cmsWrite")).toBe("cmsWrite");
    expect(normalizeTowerUsageMeterKind("image")).toBe("image");
  });
});
