import { afterEach, describe, expect, it, vi } from "vitest";

import { tryFinishBeaconTowerAuthPopup } from "./beacon-opener-auth";

describe("tryFinishBeaconTowerAuthPopup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when beaconOrigin is missing", () => {
    expect(tryFinishBeaconTowerAuthPopup(null, { id: "1", email: "a@b.c" }, "t")).toBe(false);
  });

  it("returns false when user or token is missing", () => {
    vi.stubGlobal("window", { opener: {}, location: { assign: vi.fn() } });
    expect(tryFinishBeaconTowerAuthPopup("https://beacon.test", undefined, "tok")).toBe(false);
    expect(tryFinishBeaconTowerAuthPopup("https://beacon.test", { id: "1", email: "a@b.c" }, undefined)).toBe(false);
  });

  it("posts success to opener and navigates to next step", () => {
    const postMessage = vi.fn();
    const assign = vi.fn();
    vi.stubGlobal("window", {
      opener: { postMessage },
      location: { assign },
    });
    const user = { id: "u1", email: "a@b.com", name: "U" };
    expect(tryFinishBeaconTowerAuthPopup("https://beacon.test", user, "token123")).toBe(true);
    expect(postMessage).toHaveBeenCalledWith(
      {
        type: "codalyn:tower-auth",
        status: "success",
        user,
        token: "token123",
      },
      "https://beacon.test"
    );
    expect(assign).toHaveBeenCalledWith("/integrations/beacon-popup-next");
  });
});
