import { describe, expect, it } from "vitest";
import { classifyWebflowOAuthCallback } from "@/server/webflow-oauth-callback-logic";

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

  it("returns missing_state when code is present without state — a state-less callback never belongs to a flow Tower started", () => {
    expect(
      classifyWebflowOAuthCallback({
        code: "auth_code",
        state: null,
        oauthError: null,
        oauthErrorDescription: null,
        cookieExpectedState: undefined,
      })
    ).toBe("missing_state");
  });

  it("returns missing_state when state is empty", () => {
    expect(
      classifyWebflowOAuthCallback({
        code: "auth_code",
        state: "   ",
        oauthError: null,
        oauthErrorDescription: null,
        cookieExpectedState: undefined,
      })
    ).toBe("missing_state");
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
