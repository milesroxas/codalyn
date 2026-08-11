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

  it("carries the one-time token in the URL fragment, never the query string (Marketplace round 6)", async () => {
    vi.stubEnv("VITE_TOWER_ORIGIN", "https://tower.codalyn.app");
    const { buildTowerHandoffUrl } = await import("./tower-auth-client");
    const url = buildTowerHandoffUrl("tok-123", "/connection?siteId=abc");
    expect(url).toBe("https://tower.codalyn.app/beacon-handoff#ott=tok-123&callbackUrl=%2Fconnection%3FsiteId%3Dabc");

    // The token must sit after `#`: everything before the fragment is what a server/proxy can log.
    const beforeFragment = (url ?? "").split("#")[0];
    expect(beforeFragment).toBe("https://tower.codalyn.app/beacon-handoff");
    expect(beforeFragment).not.toContain("ott");
    expect(beforeFragment).not.toContain("tok-123");
  });

  it("returns null handoff URL when Tower origin is unset", async () => {
    vi.stubEnv("VITE_TOWER_ORIGIN", "");
    const { buildTowerHandoffUrl } = await import("./tower-auth-client");
    expect(buildTowerHandoffUrl("tok", "/connection")).toBeNull();
  });
});
