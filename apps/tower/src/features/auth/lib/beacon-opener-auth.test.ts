import { afterEach, describe, expect, it, vi } from "vitest";

import { tryFinishBeaconTowerAuthPopup } from "./beacon-opener-auth";

/** In the static Beacon allowlist (`TOWER_STATIC_BEACON_PRODUCTION_ORIGINS`). */
const TRUSTED_BEACON_ORIGIN = "https://69e2b49536eded7411b48cf6.webflow-ext.com";

describe("tryFinishBeaconTowerAuthPopup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when beaconOrigin is missing", () => {
    expect(tryFinishBeaconTowerAuthPopup(null, { id: "1", email: "a@b.c" }, "t")).toBe(false);
  });

  it("returns false when user or token is missing", () => {
    vi.stubGlobal("window", { opener: {}, location: { assign: vi.fn() } });
    expect(tryFinishBeaconTowerAuthPopup(TRUSTED_BEACON_ORIGIN, undefined, "tok")).toBe(false);
    expect(tryFinishBeaconTowerAuthPopup(TRUSTED_BEACON_ORIGIN, { id: "1", email: "a@b.c" }, undefined)).toBe(false);
  });

  it("does not post the session to an untrusted beaconOrigin (account-takeover guard)", () => {
    const postMessage = vi.fn();
    const assign = vi.fn();
    vi.stubGlobal("window", { opener: { postMessage }, location: { assign } });
    const user = { id: "u1", email: "a@b.com", name: "U" };
    for (const evil of [
      "https://evil.com",
      "https://evil.webflow-ext.com.attacker.com",
      "http://69e2b49536eded7411b48cf6.webflow-ext.com", // wrong scheme
      "null",
    ]) {
      expect(tryFinishBeaconTowerAuthPopup(evil, user, "token123")).toBe(false);
    }
    expect(postMessage).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("posts success to a trusted opener origin and navigates to next step", () => {
    const postMessage = vi.fn();
    const assign = vi.fn();
    vi.stubGlobal("window", {
      opener: { postMessage },
      location: { assign },
    });
    const user = { id: "u1", email: "a@b.com", name: "U" };
    expect(tryFinishBeaconTowerAuthPopup(TRUSTED_BEACON_ORIGIN, user, "token123")).toBe(true);
    expect(postMessage).toHaveBeenCalledWith(
      {
        type: "codalyn:tower-auth",
        status: "success",
        user,
        token: "token123",
      },
      TRUSTED_BEACON_ORIGIN
    );
    expect(assign).toHaveBeenCalledWith("/integrations/beacon-popup-next");
  });

  it("accepts a Webflow Designer extension origin", () => {
    const postMessage = vi.fn();
    vi.stubGlobal("window", { opener: { postMessage }, location: { assign: vi.fn() } });
    const user = { id: "u1", email: "a@b.com", name: "U" };
    expect(tryFinishBeaconTowerAuthPopup("https://abc123.webflow-ext.com", user, "tok")).toBe(true);
    expect(postMessage).toHaveBeenCalledOnce();
  });
});
