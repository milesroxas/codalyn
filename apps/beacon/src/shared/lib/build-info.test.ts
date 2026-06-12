import { describe, expect, it } from "vitest";
import {
  BEACON_EARLY_ACCESS_LABEL,
  buildInfo,
  getBeaconAppVersionDisplay,
  parseBeaconReleaseStage,
} from "@/shared/lib/build-info";

describe("parseBeaconReleaseStage", () => {
  it("defaults to early access when unset", () => {
    expect(parseBeaconReleaseStage(undefined)).toBe("early-access");
  });

  it("accepts stable aliases", () => {
    expect(parseBeaconReleaseStage("stable")).toBe("stable");
    expect(parseBeaconReleaseStage("GA")).toBe("stable");
    expect(parseBeaconReleaseStage("general-availability")).toBe("stable");
  });
});

describe("getBeaconAppVersionDisplay", () => {
  it("includes the package version in the primary line", () => {
    const display = getBeaconAppVersionDisplay();
    expect(display.primary).toContain(`v${buildInfo.version}`);
    expect(display.primary.startsWith("Beacon ")).toBe(true);
  });

  it("includes early access in the primary line while in early access", () => {
    if (buildInfo.releaseStage !== "early-access") {
      return;
    }
    expect(getBeaconAppVersionDisplay().primary).toContain(BEACON_EARLY_ACCESS_LABEL);
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
