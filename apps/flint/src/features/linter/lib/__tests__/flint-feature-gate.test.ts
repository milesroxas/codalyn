import { describe, expect, it } from "vitest";
import { resolveFlintFeatureGate } from "@/features/linter/lib/flint-feature-gate";

describe("resolveFlintFeatureGate", () => {
  it("free tier is fully offline (no cloud features, built-ins only)", () => {
    expect(resolveFlintFeatureGate("free")).toEqual({
      tier: "free",
      cloudSync: false,
      teamConfig: false,
      lintReports: false,
      maxCustomPresets: 0,
    });
  });

  it("pro/studio unlock personal cloud features but not team config", () => {
    expect(resolveFlintFeatureGate("pro")).toMatchObject({ cloudSync: true, teamConfig: false, lintReports: true });
    expect(resolveFlintFeatureGate("studio")).toMatchObject({ cloudSync: true, teamConfig: false });
    expect(resolveFlintFeatureGate("pro").maxCustomPresets).toBe(10);
    expect(resolveFlintFeatureGate("studio").maxCustomPresets).toBe(50);
  });

  it("team unlocks team config + unlimited presets", () => {
    const gate = resolveFlintFeatureGate("team");
    expect(gate.teamConfig).toBe(true);
    expect(gate.cloudSync).toBe(true);
    expect(gate.maxCustomPresets).toBe(Number.POSITIVE_INFINITY);
  });
});
