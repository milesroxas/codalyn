import { describe, expect, it } from "vitest";
import {
  classifyWebflowOAuthCallback,
  isWebflowOAuthAuthorizationCodeExpired,
} from "@/server/webflow-oauth-callback-logic";

describe("classifyWebflowOAuthCallback", () => {
  it("returns oauth_error when Webflow sends error", () => {
    expect(
      classifyWebflowOAuthCallback({
        code: null,
        state: null,
        oauthError: "access_denied",
        oauthErrorDescription: null,
        cookieExpectedState: undefined,
      })
    ).toBe("oauth_error");
  });

  it("returns missing_code when authorization code is absent", () => {
    expect(
      classifyWebflowOAuthCallback({
        code: null,
        state: "abc",
        oauthError: null,
        oauthErrorDescription: null,
        cookieExpectedState: undefined,
      })
    ).toBe("missing_code");
  });

  it("returns webflow_initiated_install when code is present without state", () => {
    expect(
      classifyWebflowOAuthCallback({
        code: "auth_code",
        state: null,
        oauthError: null,
        oauthErrorDescription: null,
        cookieExpectedState: undefined,
      })
    ).toBe("webflow_initiated_install");
  });

  it("returns webflow_initiated_install when state is empty", () => {
    expect(
      classifyWebflowOAuthCallback({
        code: "auth_code",
        state: "   ",
        oauthError: null,
        oauthErrorDescription: null,
        cookieExpectedState: undefined,
      })
    ).toBe("webflow_initiated_install");
  });

  it("returns tower_cookie_state when state matches the Tower OAuth cookie", () => {
    expect(
      classifyWebflowOAuthCallback({
        code: "auth_code",
        state: "tower-state",
        oauthError: null,
        oauthErrorDescription: null,
        cookieExpectedState: "tower-state",
      })
    ).toBe("tower_cookie_state");
  });

  it("returns tower_db_state when state is present but does not match the cookie", () => {
    expect(
      classifyWebflowOAuthCallback({
        code: "auth_code",
        state: "popup-state",
        oauthError: null,
        oauthErrorDescription: null,
        cookieExpectedState: undefined,
      })
    ).toBe("tower_db_state");
  });
});

describe("isWebflowOAuthAuthorizationCodeExpired", () => {
  it("is false within 15 minutes", () => {
    const createdAt = new Date("2026-06-11T16:00:00.000Z");
    expect(isWebflowOAuthAuthorizationCodeExpired(createdAt, Date.parse("2026-06-11T16:14:00.000Z"))).toBe(false);
  });

  it("is true after 15 minutes", () => {
    const createdAt = new Date("2026-06-11T16:00:00.000Z");
    expect(isWebflowOAuthAuthorizationCodeExpired(createdAt, Date.parse("2026-06-11T16:15:01.000Z"))).toBe(true);
  });
});
