import { describe, expect, it } from "vitest";
import { buildInfo, getBeaconAppVersionDisplay, parseBeaconReleaseStage } from "@/shared/lib/build-info";

describe("parseBeaconReleaseStage", () => {
  // A shipped Marketplace app must present itself as complete, so an unset/unknown value must never
  // resolve to a pre-release stage.
  it("defaults to stable when unset", () => {
    expect(parseBeaconReleaseStage(undefined)).toBe("stable");
  });

  it("defaults to stable for unknown or empty values", () => {
    expect(parseBeaconReleaseStage("")).toBe("stable");
    expect(parseBeaconReleaseStage("   ")).toBe("stable");
    expect(parseBeaconReleaseStage("beta")).toBe("stable");
    expect(parseBeaconReleaseStage("stable")).toBe("stable");
  });

  it("resolves early access only on an explicit opt-in", () => {
    expect(parseBeaconReleaseStage("early-access")).toBe("early-access");
    expect(parseBeaconReleaseStage("  EARLY-ACCESS  ")).toBe("early-access");
  });
});

describe("getBeaconAppVersionDisplay", () => {
  it("includes the package version in the primary line", () => {
    const display = getBeaconAppVersionDisplay();
    expect(display.primary).toContain(`v${buildInfo.version}`);
    expect(display.primary.startsWith("Beacon ")).toBe(true);
  });

  // Release stage is telemetry-only build metadata; it must never reach user-facing copy, whatever it is.
  it("never stamps a release stage onto the user-facing version line", () => {
    expect(getBeaconAppVersionDisplay().primary.toLowerCase()).not.toContain("early access");
    expect(getBeaconAppVersionDisplay().primary.toLowerCase()).not.toContain("early-access");
  });

  it("omits build metadata in production builds", () => {
    if (buildInfo.channel !== "production") {
      return;
    }
    expect(getBeaconAppVersionDisplay().secondary).toBeNull();
  });

  it("includes build time in non-production builds", () => {
    if (buildInfo.channel === "production") {
      return;
    }
    const display = getBeaconAppVersionDisplay();
    expect(display.primary).toContain(buildInfo.channel);
    expect(display.secondary).toMatch(/^Built /);
  });
});
