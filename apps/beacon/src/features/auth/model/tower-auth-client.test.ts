import { afterEach, describe, expect, it, vi } from "vitest";

const towerOrigin = vi.hoisted(() => ({ value: "https://tower.test" }));

vi.mock("@/shared/lib/beacon-tower-origin", () => ({
  readBeaconTowerOrigin: () => towerOrigin.value.replace(/\/$/, ""),
  isBeaconTowerOriginConfigured: () => towerOrigin.value.length > 0,
}));

describe("tower-auth-client URL builders", () => {
  afterEach(() => {
    vi.resetModules();
    towerOrigin.value = "https://tower.test";
  });

  it("builds app paths on the Tower app host", async () => {
    towerOrigin.value = "https://tower-preview.codalyn.app";
    const { buildTowerAppUrl, TOWER_APP_ENTRY_PATH } = await import("./tower-auth-client");
    expect(TOWER_APP_ENTRY_PATH).toBe("/auth/continue");
    expect(buildTowerAppUrl("/beacon")).toBe("https://tower-preview.codalyn.app/beacon");
    expect(buildTowerAppUrl(TOWER_APP_ENTRY_PATH)).toBe("https://tower-preview.codalyn.app/auth/continue");
  });

  it("returns null when Tower origin is unset", async () => {
    towerOrigin.value = "";
    const { buildTowerAppUrl } = await import("./tower-auth-client");
    expect(buildTowerAppUrl("/account")).toBeNull();
  });

  it("carries the one-time token in the URL fragment, never the query string (Marketplace round 6)", async () => {
    const { buildTowerHandoffUrl } = await import("@/features/auth/lib/tower-app-link");
    const url = buildTowerHandoffUrl("https://tower.codalyn.app", "tok-123", "/connection?siteId=abc");
    expect(url).toBe("https://tower.codalyn.app/beacon-handoff#ott=tok-123&callbackUrl=%2Fconnection%3FsiteId%3Dabc");

    // The token must sit after `#`: everything before the fragment is what a server/proxy can log.
    const beforeFragment = url.split("#")[0];
    expect(beforeFragment).toBe("https://tower.codalyn.app/beacon-handoff");
    expect(beforeFragment).not.toContain("ott");
    expect(beforeFragment).not.toContain("tok-123");
  });
});

/**
 * The extension opens no windows: Tower and Webflow destinations are plain `<a target="_blank">` links whose
 * hrefs are minted ahead of the click. These tests pin the mint helpers' boundary handling — the Webflow
 * consent URL is allowlisted before it can ever be rendered, and the handoff token is only requested
 * when a Designer session exists.
 */
describe("mint helpers", () => {
  afterEach(() => {
    vi.resetModules();
    towerOrigin.value = "https://tower.test";
    vi.doUnmock("@/shared/lib/tower-client");
  });

  async function loadWithTowerFetch(impl: (path: string, init?: RequestInit) => Promise<Response>) {
    towerOrigin.value = "https://tower.example";
    const towerFetch = vi.fn(impl);
    vi.doMock("@/shared/lib/tower-client", () => ({ towerFetch }));
    const client = await import("./tower-auth-client");
    const tokenStore = await import("@/features/auth/lib/beacon-tower-session-token");
    return { client, tokenStore, towerFetch };
  }

  function jsonResponse(body: unknown, ok = true, status = 200): Response {
    return { ok, status, json: async () => body } as unknown as Response;
  }

  describe("mintWebflowAuthorizeUrl", () => {
    it("returns the consent URL when Tower answers with an allowlisted webflow.com authorize URL", async () => {
      const { client } = await loadWithTowerFetch(async () =>
        jsonResponse({ url: "https://webflow.com/oauth/authorize?state=abc" })
      );
      await expect(client.mintWebflowAuthorizeUrl()).resolves.toEqual({
        ok: true,
        url: "https://webflow.com/oauth/authorize?state=abc",
      });
    });

    it.each([
      "https://evil.example/oauth/authorize",
      "http://webflow.com/oauth/authorize",
      "https://webflow.com/dashboard",
    ])("refuses a non-allowlisted URL (%s) even on a 200", async (url) => {
      const { client } = await loadWithTowerFetch(async () => jsonResponse({ url }));
      await expect(client.mintWebflowAuthorizeUrl()).resolves.toEqual({ ok: false, error: "invalid_authorize_url" });
    });

    it("surfaces Tower's error code when it declines", async () => {
      const { client } = await loadWithTowerFetch(async () =>
        jsonResponse({ error: "team_admin_required" }, false, 403)
      );
      await expect(client.mintWebflowAuthorizeUrl()).resolves.toEqual({ ok: false, error: "team_admin_required" });
    });

    it("falls back to the HTTP status when the error body is malformed", async () => {
      const { client } = await loadWithTowerFetch(async () => jsonResponse({ error: 42 }, false, 500));
      await expect(client.mintWebflowAuthorizeUrl()).resolves.toEqual({ ok: false, error: "http_500" });
    });

    it("reports tower_unreachable on a network failure", async () => {
      const { client } = await loadWithTowerFetch(async () => {
        throw new Error("network down");
      });
      await expect(client.mintWebflowAuthorizeUrl()).resolves.toEqual({ ok: false, error: "tower_unreachable" });
    });
  });

  describe("mintTowerHandoffToken", () => {
    it("does not call Tower without a Designer session token", async () => {
      const { client, tokenStore, towerFetch } = await loadWithTowerFetch(async () => jsonResponse({ token: "x" }));
      tokenStore.clearBeaconTowerSessionToken();
      await expect(client.mintTowerHandoffToken()).resolves.toBeNull();
      expect(towerFetch).not.toHaveBeenCalled();
    });

    it("returns the trimmed token from the one-time-token endpoint", async () => {
      const { client, tokenStore, towerFetch } = await loadWithTowerFetch(async () =>
        jsonResponse({ token: " ott-1 " })
      );
      tokenStore.writeBeaconTowerSessionToken("bearer");
      await expect(client.mintTowerHandoffToken()).resolves.toBe("ott-1");
      expect(towerFetch).toHaveBeenCalledWith("/api/auth/one-time-token/generate");
    });

    it.each([
      ["non-string token", { token: 42 }, true, 200],
      ["empty token", { token: "  " }, true, 200],
      ["non-2xx", { token: "ott" }, false, 401],
    ])("returns null for %s", async (_label, body, ok, status) => {
      const { client, tokenStore } = await loadWithTowerFetch(async () => jsonResponse(body, ok, status));
      tokenStore.writeBeaconTowerSessionToken("bearer");
      await expect(client.mintTowerHandoffToken()).resolves.toBeNull();
    });
  });
});
