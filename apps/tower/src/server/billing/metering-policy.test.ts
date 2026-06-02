import { describe, expect, it } from "vitest";
import { reserveUnits, resolveMeteringPolicy, resolveUsageLimitsKind } from "@/server/billing/metering-policy";
import type { TowerLimitsSnapshot } from "@/server/billing/tower-limits-config";

describe("reserveUnits", () => {
  it("reserves a single unit when room remains", () => {
    expect(reserveUnits(0, 25, 1)).toEqual({ blocked: false, used: 1 });
  });

  it("reserves more than one image credit at once", () => {
    expect(reserveUnits(10, 25, 7)).toEqual({ blocked: false, used: 17 });
  });

  it("allows a reservation that exactly reaches the cap", () => {
    expect(reserveUnits(20, 25, 5)).toEqual({ blocked: false, used: 25 });
  });

  it("blocks when the calculated credits exceed the remaining allowance", () => {
    expect(reserveUnits(20, 25, 6)).toEqual({ blocked: true, used: 20 });
  });

  it("blocks a single request whose cost exceeds the whole cap (no partial reserve)", () => {
    expect(reserveUnits(0, 5, 10)).toEqual({ blocked: true, used: 0 });
  });

  it("treats fractional or sub-1 units as at least one unit", () => {
    expect(reserveUnits(0, 25, 0)).toEqual({ blocked: false, used: 1 });
    expect(reserveUnits(0, 25, 2.9)).toEqual({ blocked: false, used: 2 });
  });
});

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
    free: { webflowProxyRequestsPerMonth: 2_500, cmsWritesPerMonth: 500, imageOptimizesPerMonth: 25 },
    pro: { webflowProxyRequestsPerMonth: 25_000, cmsWritesPerMonth: 5_000, imageOptimizesPerMonth: 500 },
    studio: { webflowProxyRequestsPerMonth: 60_000, cmsWritesPerMonth: 12_000, imageOptimizesPerMonth: 1_500 },
    team: { webflowProxyRequestsPerMonth: 120_000, cmsWritesPerMonth: 25_000, imageOptimizesPerMonth: 3_000 },
    updatedAt: null,
  };

  it("applies free tier defaults when metering is enabled", () => {
    const policy = resolveMeteringPolicy({ tier: "free", user, organization, limits });
    expect(policy.skipMetering).toBe(false);
    expect(policy.webflowProxyCap).toBe(2_500);
    expect(policy.cmsWriteCap).toBe(500);
    expect(policy.imageCap).toBe(25);
  });

  it("applies pro tier defaults when metering is enabled", () => {
    const policy = resolveMeteringPolicy({ tier: "pro", user, organization, limits });
    expect(policy.skipMetering).toBe(false);
    expect(policy.webflowProxyCap).toBe(25_000);
    expect(policy.cmsWriteCap).toBe(5_000);
    expect(policy.imageCap).toBe(500);
  });

  it("applies studio tier defaults when metering is enabled", () => {
    const policy = resolveMeteringPolicy({ tier: "studio", user, organization, limits });
    expect(policy.skipMetering).toBe(false);
    expect(policy.webflowProxyCap).toBe(60_000);
    expect(policy.cmsWriteCap).toBe(12_000);
    expect(policy.imageCap).toBe(1_500);
  });

  it("applies team tier defaults when metering is enabled", () => {
    const policy = resolveMeteringPolicy({ tier: "team", user, organization, limits });
    expect(policy.skipMetering).toBe(false);
    expect(policy.webflowProxyCap).toBe(120_000);
    expect(policy.cmsWriteCap).toBe(25_000);
    expect(policy.imageCap).toBe(3_000);
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

  it("keeps user scope by default with no seat multiplication", () => {
    const policy = resolveMeteringPolicy({ tier: "team", user, organization, limits });
    expect(policy.usageScope).toBe("user");
    expect(policy.paidSeatCount).toBe(1);
    expect(policy.webflowProxyCap).toBe(120_000);
  });

  it("pools the Team cap as per-seat cap × paid seats for workspace scope", () => {
    const policy = resolveMeteringPolicy({
      tier: "team",
      user,
      organization,
      limits,
      billingScope: "workspace",
      paidSeatCount: 6,
    });
    expect(policy.usageScope).toBe("workspace");
    expect(policy.paidSeatCount).toBe(6);
    expect(policy.webflowProxyCap).toBe(120_000 * 6);
    expect(policy.cmsWriteCap).toBe(25_000 * 6);
    expect(policy.imageCap).toBe(3_000 * 6);
  });

  it("treats a workspace override as the absolute pooled cap (no seat multiplication)", () => {
    const policy = resolveMeteringPolicy({
      tier: "team",
      user,
      organization: { ...organization, webflowProxyLimitOverride: 999 },
      limits,
      billingScope: "workspace",
      paidSeatCount: 6,
    });
    expect(policy.webflowProxyCap).toBe(999);
    // Non-overridden meters still pool from per-seat defaults.
    expect(policy.cmsWriteCap).toBe(25_000 * 6);
  });

  it("ignores individual user overrides for a pooled workspace cap", () => {
    const policy = resolveMeteringPolicy({
      tier: "team",
      user: { ...user, webflowProxyLimitOverride: 5 },
      organization,
      limits,
      billingScope: "workspace",
      paidSeatCount: 2,
    });
    expect(policy.webflowProxyCap).toBe(120_000 * 2);
  });

  it("governs pooled metering by the workspace toggle, not per-member toggles", () => {
    const userOff = resolveMeteringPolicy({
      tier: "team",
      user: { ...user, meteringEnabled: false },
      organization,
      limits,
      billingScope: "workspace",
      paidSeatCount: 6,
    });
    expect(userOff.skipMetering).toBe(false);

    const workspaceOff = resolveMeteringPolicy({
      tier: "team",
      user,
      organization: { ...organization, meteringEnabled: false },
      limits,
      billingScope: "workspace",
      paidSeatCount: 6,
    });
    expect(workspaceOff.skipMetering).toBe(true);
  });
});

describe("pooled Team reservation", () => {
  const perSeatImageCap = 3_000;
  const seats = 6;
  const pooledCap = perSeatImageCap * seats;

  it("decrements the shared pool as members consume it", () => {
    let used = 0;
    for (let i = 0; i < 3; i += 1) {
      const decision = reserveUnits(used, pooledCap, 1);
      expect(decision.blocked).toBe(false);
      used = decision.used;
    }
    expect(used).toBe(3);
  });

  it("blocks when remaining pooled credits are insufficient", () => {
    expect(reserveUnits(pooledCap - 2, pooledCap, 5)).toEqual({ blocked: true, used: pooledCap - 2 });
    expect(reserveUnits(pooledCap, pooledCap, 1)).toEqual({ blocked: true, used: pooledCap });
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
