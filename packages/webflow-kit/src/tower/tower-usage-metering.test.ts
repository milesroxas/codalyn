import { describe, expect, it } from "vitest";
import {
  buildTowerUsageMeterSnapshot,
  classifyUsageMeter,
  normalizeTowerUsageMeterKind,
  normalizeTowerUsageStatusSnapshot,
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

describe("buildTowerUsageMeterSnapshot", () => {
  it("uses limit as progressMax when metered", () => {
    expect(buildTowerUsageMeterSnapshot("webflowProxy", 10, 100)).toEqual({
      kind: "webflowProxy",
      used: 10,
      limit: 100,
      progressMax: 100,
      level: "ok",
    });
  });

  it("uses explicit progressMax when limit is null", () => {
    expect(buildTowerUsageMeterSnapshot("image", 25, null, 50)).toEqual({
      kind: "image",
      used: 25,
      limit: null,
      progressMax: 50,
      level: "unmetered",
    });
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

describe("normalizeTowerUsageStatusSnapshot", () => {
  const validPayload = {
    yearMonth: "2026-06",
    tier: "studio",
    plan: { key: "studio", name: "Studio", billingScope: "user" },
    limitsKind: "standard",
    metered: true,
    meters: [{ kind: "webflowProxy", used: 10, limit: 100, progressMax: 100, level: "ok" }],
    approachingMeters: [],
    designerApiBreakdown: null,
  };

  it("parses a canonical payload", () => {
    const result = normalizeTowerUsageStatusSnapshot(validPayload);
    expect(result?.tier).toBe("studio");
    expect(result?.plan).toEqual({ key: "studio", name: "Studio", billingScope: "user" });
    expect(result?.meters).toHaveLength(1);
  });

  it("defaults usage scope to user and preserves an explicit workspace scope", () => {
    expect(normalizeTowerUsageStatusSnapshot(validPayload)?.usageScope).toBe("user");
    expect(
      normalizeTowerUsageStatusSnapshot({
        ...validPayload,
        tier: "team",
        plan: { key: "team", name: "Team", billingScope: "workspace" },
        usageScope: "workspace",
      })?.usageScope
    ).toBe("workspace");
  });

  it("falls back to user scope for an unknown usageScope value (Beacon-safe)", () => {
    expect(normalizeTowerUsageStatusSnapshot({ ...validPayload, usageScope: "bogus" })?.usageScope).toBe("user");
  });

  it("preserves the image (credits) meter shape", () => {
    const result = normalizeTowerUsageStatusSnapshot({
      ...validPayload,
      meters: [
        { kind: "webflowProxy", used: 10, limit: 100, progressMax: 100, level: "ok" },
        { kind: "image", used: 120, limit: 1500, progressMax: 1500, level: "ok" },
      ],
    });
    const imageMeter = result?.meters.find((meter) => meter.kind === "image");
    expect(imageMeter).toEqual({ kind: "image", used: 120, limit: 1500, progressMax: 1500, level: "ok" });
  });

  it("derives plan context from tier when plan is missing", () => {
    const { plan: _omitted, ...withoutPlan } = validPayload;
    const result = normalizeTowerUsageStatusSnapshot(withoutPlan);
    expect(result?.plan).toEqual({ key: "studio", name: "Studio", billingScope: "user" });
  });

  it("degrades unknown tier to free and drops malformed meters", () => {
    const result = normalizeTowerUsageStatusSnapshot({
      ...validPayload,
      tier: "enterprise",
      plan: undefined,
      meters: [{ kind: "webflowProxy", used: 5, limit: 50 }, { kind: "bogus", used: 1 }, { used: 2 }],
    });
    expect(result?.tier).toBe("free");
    expect(result?.plan.name).toBe("Free");
    expect(result?.meters).toHaveLength(1);
  });

  it("returns null when the payload is unusable", () => {
    expect(normalizeTowerUsageStatusSnapshot(null)).toBeNull();
    expect(normalizeTowerUsageStatusSnapshot({ tier: "pro" })).toBeNull();
    expect(normalizeTowerUsageStatusSnapshot({ yearMonth: "2026-06", meters: [] })).toBeNull();
  });
});
