import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREVIEW_TOWER_ORIGIN,
  DEFAULT_PRODUCTION_TOWER_ORIGIN,
  isTowerMarketingOnlyHost,
  resolveBeaconTowerOriginForBuild,
} from "./resolve-beacon-tower-origin-for-build";

describe("resolveBeaconTowerOriginForBuild", () => {
  it("defaults production builds to the Tower app subdomain", () => {
    expect(resolveBeaconTowerOriginForBuild({ mode: "production" })).toBe(DEFAULT_PRODUCTION_TOWER_ORIGIN);
  });

  it("rejects marketing hosts in production bundles", () => {
    expect(
      resolveBeaconTowerOriginForBuild({
        mode: "production",
        explicitOrigin: "https://codalyn.app",
      })
    ).toBe(DEFAULT_PRODUCTION_TOWER_ORIGIN);
    expect(
      resolveBeaconTowerOriginForBuild({
        mode: "production",
        explicitOrigin: "https://preview.codalyn.app",
      })
    ).toBe(DEFAULT_PRODUCTION_TOWER_ORIGIN);
  });

  it("keeps explicit app hosts in production", () => {
    expect(
      resolveBeaconTowerOriginForBuild({
        mode: "production",
        explicitOrigin: "https://tower-preview.codalyn.app",
      })
    ).toBe("https://tower-preview.codalyn.app");
  });

  it("defaults development builds to local Tower", () => {
    expect(resolveBeaconTowerOriginForBuild({ mode: "development" })).toBe("http://localhost:3100");
  });

  it("defaults preview builds to the Tower preview app subdomain", () => {
    expect(resolveBeaconTowerOriginForBuild({ mode: "preview" })).toBe(DEFAULT_PREVIEW_TOWER_ORIGIN);
  });

  it("rejects marketing hosts in preview bundles", () => {
    expect(
      resolveBeaconTowerOriginForBuild({
        mode: "preview",
        explicitOrigin: "https://preview.codalyn.app",
      })
    ).toBe(DEFAULT_PREVIEW_TOWER_ORIGIN);
  });

  it("identifies marketing-only hosts", () => {
    expect(isTowerMarketingOnlyHost("codalyn.app")).toBe(true);
    expect(isTowerMarketingOnlyHost("tower.codalyn.app")).toBe(false);
    expect(isTowerMarketingOnlyHost("tower-preview.codalyn.app")).toBe(false);
  });
});
