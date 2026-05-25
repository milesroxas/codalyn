import { describe, expect, it } from "vitest";
import { resolveMeteringPolicy } from "@/server/billing/metering-policy";
import type { TowerLimitsSnapshot } from "@/server/billing/tower-limits-config";

describe("resolveMeteringPolicy", () => {
  const user = {
    meteringEnabled: true,
    webflowRequestLimitOverride: null,
    imageOptimizeLimitOverride: null,
  };

  const organization = {
    meteringEnabled: true,
    webflowRequestLimitOverride: null,
    imageOptimizeLimitOverride: null,
  };

  const limits: TowerLimitsSnapshot = {
    globalMeteringEnabled: true,
    envEmergencyMeteringDisabled: false,
    free: { webflowRequestsPerMonth: 3_000, imageOptimizesPerMonth: 50 },
    pro: { webflowRequestsPerMonth: 200_000, imageOptimizesPerMonth: 10_000 },
    updatedAt: null,
  };

  it("applies free tier defaults when metering is enabled", () => {
    const policy = resolveMeteringPolicy({ tier: "free", user, organization, limits });
    expect(policy.skipMetering).toBe(false);
    expect(policy.webflowCap).toBe(3_000);
    expect(policy.imageCap).toBe(50);
  });

  it("skips metering for pro tier", () => {
    const policy = resolveMeteringPolicy({ tier: "pro", user, organization, limits });
    expect(policy.skipMetering).toBe(true);
    expect(policy.webflowCap).toBeNull();
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
      user: { ...user, webflowRequestLimitOverride: 120, imageOptimizeLimitOverride: 7 },
      organization: {
        ...organization,
        webflowRequestLimitOverride: 500,
        imageOptimizeLimitOverride: 20,
      },
      limits,
    });
    expect(policy.webflowCap).toBe(120);
    expect(policy.imageCap).toBe(7);
  });

  it("uses organization override when user override is null", () => {
    const policy = resolveMeteringPolicy({
      tier: "free",
      user,
      organization: {
        ...organization,
        webflowRequestLimitOverride: 500,
        imageOptimizeLimitOverride: 20,
      },
      limits,
    });
    expect(policy.webflowCap).toBe(500);
    expect(policy.imageCap).toBe(20);
  });
});
