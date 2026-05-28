import { describe, expect, it } from "vitest";
import { resolveMeteringPolicy, resolveUsageLimitsKind } from "@/server/billing/metering-policy";
import type { TowerLimitsSnapshot } from "@/server/billing/tower-limits-config";

describe("resolveMeteringPolicy", () => {
  const user = {
    meteringEnabled: true,
    webflowProxyLimitOverride: null,
    cmsWriteLimitOverride: null,
    imageOptimizeLimitOverride: null,
  };

  const organization = {
    meteringEnabled: true,
    webflowProxyLimitOverride: null,
    cmsWriteLimitOverride: null,
    imageOptimizeLimitOverride: null,
  };

  const limits: TowerLimitsSnapshot = {
    globalMeteringEnabled: true,
    envEmergencyMeteringDisabled: false,
    free: { webflowProxyRequestsPerMonth: 2_500, cmsWritesPerMonth: 500, imageOptimizesPerMonth: 50 },
    pro: { webflowProxyRequestsPerMonth: 150_000, cmsWritesPerMonth: 50_000, imageOptimizesPerMonth: 10_000 },
    updatedAt: null,
  };

  it("applies free tier defaults when metering is enabled", () => {
    const policy = resolveMeteringPolicy({ tier: "free", user, organization, limits });
    expect(policy.skipMetering).toBe(false);
    expect(policy.webflowProxyCap).toBe(2_500);
    expect(policy.cmsWriteCap).toBe(500);
    expect(policy.imageCap).toBe(50);
  });

  it("skips metering for pro tier", () => {
    const policy = resolveMeteringPolicy({ tier: "pro", user, organization, limits });
    expect(policy.skipMetering).toBe(true);
    expect(policy.webflowProxyCap).toBeNull();
    expect(policy.cmsWriteCap).toBeNull();
    expect(policy.imageCap).toBeNull();
  });

  it("skips metering when user metering is disabled", () => {
    const policy = resolveMeteringPolicy({
      tier: "free",
      user: { ...user, meteringEnabled: false },
      organization,
      limits,
    });
    expect(policy.skipMetering).toBe(true);
  });

  it("skips metering when workspace metering is disabled", () => {
    const policy = resolveMeteringPolicy({
      tier: "free",
      user,
      organization: { ...organization, meteringEnabled: false },
      limits,
    });
    expect(policy.skipMetering).toBe(true);
  });

  it("skips metering when global metering is disabled", () => {
    const policy = resolveMeteringPolicy({
      tier: "free",
      user,
      organization,
      limits: { ...limits, globalMeteringEnabled: false },
    });
    expect(policy.skipMetering).toBe(true);
  });

  it("prefers user override over organization override", () => {
    const policy = resolveMeteringPolicy({
      tier: "free",
      user: {
        ...user,
        webflowProxyLimitOverride: 120,
        cmsWriteLimitOverride: 30,
        imageOptimizeLimitOverride: 7,
      },
      organization: {
        ...organization,
        webflowProxyLimitOverride: 500,
        cmsWriteLimitOverride: 100,
        imageOptimizeLimitOverride: 20,
      },
      limits,
    });
    expect(policy.webflowProxyCap).toBe(120);
    expect(policy.cmsWriteCap).toBe(30);
    expect(policy.imageCap).toBe(7);
  });

  it("uses organization override when user override is null", () => {
    const policy = resolveMeteringPolicy({
      tier: "free",
      user,
      organization: {
        ...organization,
        webflowProxyLimitOverride: 500,
        cmsWriteLimitOverride: 100,
        imageOptimizeLimitOverride: 20,
      },
      limits,
    });
    expect(policy.webflowProxyCap).toBe(500);
    expect(policy.cmsWriteCap).toBe(100);
    expect(policy.imageCap).toBe(20);
  });
});

describe("resolveUsageLimitsKind", () => {
  const user = {
    meteringEnabled: true,
    webflowProxyLimitOverride: null,
    cmsWriteLimitOverride: null,
    imageOptimizeLimitOverride: null,
  };

  it("returns standard for metered free tier without overrides", () => {
    expect(resolveUsageLimitsKind({ skipMetering: false }, user, null)).toBe("standard");
  });

  it("returns custom when any limit override is set", () => {
    expect(resolveUsageLimitsKind({ skipMetering: false }, { ...user, webflowProxyLimitOverride: 10_000 }, null)).toBe(
      "custom"
    );
  });

  it("returns unmetered when metering is skipped", () => {
    expect(resolveUsageLimitsKind({ skipMetering: true }, user, null)).toBe("unmetered");
  });
});
