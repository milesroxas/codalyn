import { describe, expect, it } from "vitest";
import type { TowerLimitsSnapshot } from "@/server/billing/tower-limits-config";
import { applyLimitTokens, resolveLimitToken, resolveLimitTokensInText } from "./limit-tokens";

const snapshot: TowerLimitsSnapshot = {
  globalMeteringEnabled: true,
  envEmergencyMeteringDisabled: false,
  free: { webflowProxyRequestsPerMonth: 2_500, cmsWritesPerMonth: 500, imageOptimizesPerMonth: 50 },
  pro: { webflowProxyRequestsPerMonth: 150_000, cmsWritesPerMonth: 50_000, imageOptimizesPerMonth: 10_000 },
  studio: { webflowProxyRequestsPerMonth: 60_000, cmsWritesPerMonth: 12_000, imageOptimizesPerMonth: 3_000 },
  team: { webflowProxyRequestsPerMonth: 150_000, cmsWritesPerMonth: 50_000, imageOptimizesPerMonth: 10_000 },
  updatedAt: null,
};

describe("resolveLimitToken", () => {
  it("resolves marketing aliases with thousands separators", () => {
    expect(resolveLimitToken(snapshot, "pro", "webflowUpdates")).toBe("150,000");
    expect(resolveLimitToken(snapshot, "free", "cmsWrites")).toBe("500");
    expect(resolveLimitToken(snapshot, "studio", "imageCredits")).toBe("3,000");
  });

  it("resolves raw snapshot keys", () => {
    expect(resolveLimitToken(snapshot, "team", "webflowProxyRequestsPerMonth")).toBe("150,000");
    expect(resolveLimitToken(snapshot, "free", "imageOptimizesPerMonth")).toBe("50");
  });

  it("returns null for unknown tier or metric", () => {
    expect(resolveLimitToken(snapshot, "enterprise", "cmsWrites")).toBeNull();
    expect(resolveLimitToken(snapshot, "pro", "widgets")).toBeNull();
  });

  it("returns null for malformed snapshot values instead of rendering garbage", () => {
    const broken = {
      ...snapshot,
      pro: { ...snapshot.pro, cmsWritesPerMonth: Number.NaN },
    };
    expect(resolveLimitToken(broken, "pro", "cmsWrites")).toBeNull();
  });
});

describe("resolveLimitTokensInText", () => {
  it("replaces multiple tokens in one string", () => {
    expect(
      resolveLimitTokensInText(
        "{{limits.pro.webflowUpdates}} Webflow updates, {{limits.pro.cmsWrites}} CMS writes / month",
        snapshot
      )
    ).toBe("150,000 Webflow updates, 50,000 CMS writes / month");
  });

  it("tolerates whitespace inside the braces", () => {
    expect(resolveLimitTokensInText("{{ limits.free.imageCredits }} image credits", snapshot)).toBe("50 image credits");
  });

  it("leaves unknown tokens verbatim so authors can spot typos", () => {
    expect(resolveLimitTokensInText("{{limits.pro.widgets}} things", snapshot)).toBe("{{limits.pro.widgets}} things");
    expect(resolveLimitTokensInText("{{limits.enterprise.cmsWrites}}", snapshot)).toBe(
      "{{limits.enterprise.cmsWrites}}"
    );
  });

  it("leaves token-free text untouched", () => {
    expect(resolveLimitTokensInText("Roles, invites, and shared Webflow access", snapshot)).toBe(
      "Roles, invites, and shared Webflow access"
    );
  });
});

describe("applyLimitTokens", () => {
  it("resolves tokens across nested block structures without mutating input", () => {
    const layout = [
      {
        blockType: "pricingPlans",
        plans: [
          {
            name: "Pro",
            features: [{ text: "{{limits.pro.webflowUpdates}} Webflow updates / month" }],
          },
        ],
      },
    ];
    const resolved = applyLimitTokens(layout, snapshot);
    expect(resolved[0]?.plans[0]?.features[0]?.text).toBe("150,000 Webflow updates / month");
    expect(layout[0]?.plans[0]?.features[0]?.text).toBe("{{limits.pro.webflowUpdates}} Webflow updates / month");
  });

  it("passes through non-string leaves (numbers, booleans, null)", () => {
    const input = { featured: true, order: 3, badge: null, price: "$12" };
    expect(applyLimitTokens(input, snapshot)).toEqual(input);
  });
});
