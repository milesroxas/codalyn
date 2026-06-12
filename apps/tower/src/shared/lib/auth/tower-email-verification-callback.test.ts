import { describe, expect, it } from "vitest";
import {
  isEmailVerificationRedirectError,
  resolveTowerEmailVerificationCallbackPath,
  stripLegacyEmailVerifiedQueryParam,
  stripTransientVerificationCallbackQueryParams,
} from "@/shared/lib/auth/tower-email-verification-callback";

describe("resolveTowerEmailVerificationCallbackPath", () => {
  it("sanitizes unsafe paths without adding flash query params", () => {
    expect(resolveTowerEmailVerificationCallbackPath("/dashboard")).toBe("/dashboard");
    expect(resolveTowerEmailVerificationCallbackPath("//evil.example")).toBe("/");
    expect(resolveTowerEmailVerificationCallbackPath("https://evil.example")).toBe("/");
  });

  it("strips legacy and transient query params from callback paths", () => {
    expect(resolveTowerEmailVerificationCallbackPath("/dashboard?emailVerified=1")).toBe("/dashboard");
    expect(resolveTowerEmailVerificationCallbackPath("/connection?connection=connected")).toBe("/connection");
    expect(resolveTowerEmailVerificationCallbackPath("/billing?emailVerified=1&tab=usage")).toBe("/billing?tab=usage");
  });
});

describe("stripLegacyEmailVerifiedQueryParam", () => {
  it("removes only the legacy flash param", () => {
    expect(stripLegacyEmailVerifiedQueryParam("/account")).toBe("/account");
    expect(stripLegacyEmailVerifiedQueryParam("/?emailVerified=1")).toBe("/");
    expect(stripLegacyEmailVerifiedQueryParam("/billing?emailVerified=1&tab=usage")).toBe("/billing?tab=usage");
  });
});

describe("stripTransientVerificationCallbackQueryParams", () => {
  it("removes legacy flash and Webflow status params", () => {
    expect(stripTransientVerificationCallbackQueryParams("/connection?connection=connected&webflow=connected")).toBe(
      "/connection"
    );
    expect(stripTransientVerificationCallbackQueryParams("/dashboard?emailVerified=1&tab=usage")).toBe(
      "/dashboard?tab=usage"
    );
  });
});

describe("isEmailVerificationRedirectError", () => {
  it("matches Better Auth verify-email redirect errors only", () => {
    expect(isEmailVerificationRedirectError("invalid_token")).toBe(true);
    expect(isEmailVerificationRedirectError("TOKEN_EXPIRED")).toBe(true);
    expect(isEmailVerificationRedirectError("invalid_state")).toBe(false);
    expect(isEmailVerificationRedirectError("token_exchange")).toBe(false);
  });
});
