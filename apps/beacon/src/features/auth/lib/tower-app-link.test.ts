import { describe, expect, it } from "vitest";
import {
  buildTowerHandoffUrl,
  externalAnchorProps,
  isAllowedWebflowAuthorizeUrl,
  isTowerHandoffTokenStale,
  isWebflowAuthorizeUrlStale,
  resolveTowerAppHref,
  TOWER_HANDOFF_TOKEN_STALE_MS,
  towerConnectionPathForSite,
  WEBFLOW_AUTHORIZE_URL_STALE_MS,
} from "./tower-app-link";

const ORIGIN = "https://tower.example";

describe("externalAnchorProps", () => {
  it("always opens a new tab with no opener and no referrer", () => {
    expect(externalAnchorProps("https://tower.example/x")).toEqual({
      href: "https://tower.example/x",
      target: "_blank",
      rel: "noopener noreferrer",
    });
  });
});

describe("resolveTowerAppHref", () => {
  it("returns the handoff URL (token in the fragment, never the query) when a token is available", () => {
    const href = resolveTowerAppHref({ towerOrigin: ORIGIN, path: "/connection?siteId=abc", token: "tok 1" });
    expect(href).toBe(`${ORIGIN}/beacon-handoff#ott=tok%201&callbackUrl=%2Fconnection%3FsiteId%3Dabc`);
    expect(new URL(href as string).search).toBe("");
  });

  it("falls back to the plain route without a token", () => {
    expect(resolveTowerAppHref({ towerOrigin: ORIGIN, path: "/billing", token: null })).toBe(`${ORIGIN}/billing`);
    expect(resolveTowerAppHref({ towerOrigin: ORIGIN, path: "billing", token: null })).toBe(`${ORIGIN}/billing`);
  });

  it("is null when no Tower origin is configured", () => {
    expect(resolveTowerAppHref({ towerOrigin: "", path: "/billing", token: "tok" })).toBeNull();
    expect(resolveTowerAppHref({ towerOrigin: "  ", path: "/billing", token: null })).toBeNull();
  });

  it("only ever points at the configured Tower origin", () => {
    for (const path of ["/billing", "//evil.example/x", "/beacon-handoff#ott=x"]) {
      const href = resolveTowerAppHref({ towerOrigin: ORIGIN, path, token: "tok" });
      expect(new URL(href as string).origin).toBe(ORIGIN);
    }
  });
});

describe("buildTowerHandoffUrl", () => {
  it("normalizes a bare callback path", () => {
    expect(buildTowerHandoffUrl(ORIGIN, "t", "account")).toBe(`${ORIGIN}/beacon-handoff#ott=t&callbackUrl=%2Faccount`);
  });
});

describe("staleness windows", () => {
  it("re-mints a handoff token after 90 s (Tower TTL is 3 min)", () => {
    expect(isTowerHandoffTokenStale(0, TOWER_HANDOFF_TOKEN_STALE_MS - 1)).toBe(false);
    expect(isTowerHandoffTokenStale(0, TOWER_HANDOFF_TOKEN_STALE_MS)).toBe(true);
    expect(TOWER_HANDOFF_TOKEN_STALE_MS).toBeLessThan(3 * 60_000);
  });

  it("re-mints an authorize URL after 8 min (Tower state TTL is 10 min)", () => {
    expect(isWebflowAuthorizeUrlStale(0, WEBFLOW_AUTHORIZE_URL_STALE_MS - 1)).toBe(false);
    expect(isWebflowAuthorizeUrlStale(0, WEBFLOW_AUTHORIZE_URL_STALE_MS)).toBe(true);
    expect(WEBFLOW_AUTHORIZE_URL_STALE_MS).toBeLessThan(10 * 60_000);
  });
});

describe("towerConnectionPathForSite", () => {
  it("scopes to the site id when known, unscoped otherwise", () => {
    expect(towerConnectionPathForSite("abc 123")).toBe("/connection?siteId=abc%20123");
    expect(towerConnectionPathForSite(" ")).toBe("/connection");
    expect(towerConnectionPathForSite(null)).toBe("/connection");
    expect(towerConnectionPathForSite(undefined)).toBe("/connection");
  });
});

describe("isAllowedWebflowAuthorizeUrl", () => {
  it("accepts exactly https://webflow.com/oauth/authorize", () => {
    expect(isAllowedWebflowAuthorizeUrl("https://webflow.com/oauth/authorize?state=abc&client_id=x")).toBe(true);
  });

  it.each([
    ["wrong host", "https://evil.example/oauth/authorize"],
    ["lookalike host", "https://webflow.com.evil.example/oauth/authorize"],
    ["subdomain", "https://app.webflow.com/oauth/authorize"],
    ["non-https", "http://webflow.com/oauth/authorize"],
    ["wrong path", "https://webflow.com/dashboard"],
    ["path prefix", "https://webflow.com/oauth/authorize/extra"],
    ["not a URL", "oauth/authorize"],
    ["empty", ""],
  ])("rejects %s", (_label, url) => {
    expect(isAllowedWebflowAuthorizeUrl(url)).toBe(false);
  });
});
