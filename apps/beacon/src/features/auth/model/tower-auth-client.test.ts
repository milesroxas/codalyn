import { afterEach, describe, expect, it, vi } from "vitest";

describe("tower-auth-client URL builders", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("builds auth popup URLs on the Tower app host with beaconOrigin", async () => {
    vi.stubEnv("VITE_TOWER_ORIGIN", "https://tower.codalyn.app");
    const { buildTowerAuthPopupUrl } = await import("./tower-auth-client");
    expect(buildTowerAuthPopupUrl("/sign-in", "https://69e2b49536eded7411b48cf6.webflow-ext.com")).toBe(
      "https://tower.codalyn.app/sign-in?beaconOrigin=https%3A%2F%2F69e2b49536eded7411b48cf6.webflow-ext.com"
    );
  });

  it("builds app paths on the Tower app host", async () => {
    vi.stubEnv("VITE_TOWER_ORIGIN", "https://tower-preview.codalyn.app");
    const { buildTowerAppUrl, TOWER_APP_ENTRY_PATH } = await import("./tower-auth-client");
    expect(TOWER_APP_ENTRY_PATH).toBe("/auth/continue");
    expect(buildTowerAppUrl("/beacon")).toBe("https://tower-preview.codalyn.app/beacon");
    expect(buildTowerAppUrl(TOWER_APP_ENTRY_PATH)).toBe("https://tower-preview.codalyn.app/auth/continue");
  });

  it("returns null when Tower origin is unset", async () => {
    vi.stubEnv("VITE_TOWER_ORIGIN", "");
    const { buildTowerAppUrl } = await import("./tower-auth-client");
    expect(buildTowerAppUrl("/account")).toBeNull();
  });
});
