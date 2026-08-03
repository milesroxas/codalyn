import { describe, expect, it } from "vitest";

import { isTrustedRedirectUrl } from "./trusted-redirect";

const TOWER = "https://tower.codalyn.com";

describe("isTrustedRedirectUrl", () => {
  it("accepts URLs on the Tower origin", () => {
    expect(isTrustedRedirectUrl(`${TOWER}/auth/continue`, TOWER)).toBe(true);
    expect(isTrustedRedirectUrl(`${TOWER}/`, TOWER)).toBe(true);
  });

  it("accepts the Webflow OAuth consent screen", () => {
    expect(isTrustedRedirectUrl("https://webflow.com/oauth/authorize?client_id=x", TOWER)).toBe(true);
  });

  it("rejects other webflow.com paths and subdomains", () => {
    expect(isTrustedRedirectUrl("https://webflow.com/dashboard", TOWER)).toBe(false);
    expect(isTrustedRedirectUrl("https://evil.webflow.com/oauth/authorize", TOWER)).toBe(false);
    expect(isTrustedRedirectUrl("https://webflow.com.evil.example/oauth/authorize", TOWER)).toBe(false);
  });

  it("rejects arbitrary origins, schemes, and malformed values", () => {
    expect(isTrustedRedirectUrl("https://evil.example/", TOWER)).toBe(false);
    expect(isTrustedRedirectUrl("http://webflow.com/oauth/authorize", TOWER)).toBe(false);
    expect(isTrustedRedirectUrl("javascript:alert(1)", TOWER)).toBe(false);
    expect(isTrustedRedirectUrl("//evil.example/", TOWER)).toBe(false);
    expect(isTrustedRedirectUrl("/relative/path", TOWER)).toBe(false);
    expect(isTrustedRedirectUrl("", TOWER)).toBe(false);
    expect(isTrustedRedirectUrl(null, TOWER)).toBe(false);
    expect(isTrustedRedirectUrl({ url: TOWER }, TOWER)).toBe(false);
  });

  it("matches the Tower origin exactly (scheme + host + port)", () => {
    expect(isTrustedRedirectUrl("http://localhost:3000/connection", "http://localhost:3000")).toBe(true);
    expect(isTrustedRedirectUrl("http://localhost:4000/connection", "http://localhost:3000")).toBe(false);
    expect(isTrustedRedirectUrl("https://tower.codalyn.com.evil.example/x", TOWER)).toBe(false);
  });

  it("still allows Webflow OAuth when the Tower origin is empty or malformed", () => {
    expect(isTrustedRedirectUrl("https://webflow.com/oauth/authorize", "")).toBe(true);
    expect(isTrustedRedirectUrl("https://webflow.com/oauth/authorize", "not a url")).toBe(true);
    expect(isTrustedRedirectUrl("https://evil.example/", "not a url")).toBe(false);
  });
});
