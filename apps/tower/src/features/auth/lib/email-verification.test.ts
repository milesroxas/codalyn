import { describe, expect, it } from "vitest";
import {
  buildTowerVerifyEmailApiUrl,
  isEmailNotVerifiedAuthError,
  readEmailVerificationCallbackUrl,
  resolveCheckEmailPromptCopy,
  resolveTowerAppCallbackUrl,
  resolveTowerEmailVerificationAppCallbackUrl,
  resolveTowerEmailVerificationCallbackUrl,
  stripLegacyEmailVerifiedQueryParam,
} from "@/features/auth/lib/email-verification";

describe("resolveTowerEmailVerificationCallbackUrl", () => {
  it("sanitizes unsafe paths without adding flash query params", () => {
    expect(resolveTowerEmailVerificationCallbackUrl("/dashboard")).toBe("/dashboard");
    expect(resolveTowerEmailVerificationCallbackUrl("//evil.example")).toBe("/");
    expect(resolveTowerEmailVerificationCallbackUrl("https://evil.example")).toBe("/");
  });

  it("strips legacy emailVerified query params from callback paths", () => {
    expect(resolveTowerEmailVerificationCallbackUrl("/dashboard?emailVerified=1")).toBe("/dashboard");
    expect(resolveTowerEmailVerificationCallbackUrl("/billing?emailVerified=1&tab=usage")).toBe("/billing?tab=usage");
  });
});

describe("stripLegacyEmailVerifiedQueryParam", () => {
  it("removes only the legacy flash param", () => {
    expect(stripLegacyEmailVerifiedQueryParam("/account")).toBe("/account");
    expect(stripLegacyEmailVerifiedQueryParam("/?emailVerified=1")).toBe("/");
    expect(stripLegacyEmailVerifiedQueryParam("/billing?emailVerified=1&tab=usage")).toBe("/billing?tab=usage");
  });
});

describe("resolveTowerEmailVerificationAppCallbackUrl", () => {
  it("composes absolute url from env base when set", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    expect(resolveTowerEmailVerificationAppCallbackUrl("/billing")).toBe("https://app.example.com/billing");
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });
});

describe("resolveTowerAppCallbackUrl", () => {
  it("sanitizes unsafe paths", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    expect(resolveTowerAppCallbackUrl("//evil.example")).toBe("https://app.example.com/");
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });
});

describe("readEmailVerificationCallbackUrl", () => {
  it("accepts same-origin absolute callback URLs and strips legacy flash params", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    expect(
      readEmailVerificationCallbackUrl(
        new URLSearchParams("callbackURL=https%3A%2F%2Fapp.example.com%2Fbilling%3FemailVerified%3D1")
      )
    ).toBe("/billing");
    if (prev === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  });

  it("falls back to a safe default for missing or invalid callbacks", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(readEmailVerificationCallbackUrl(new URLSearchParams())).toBe("/");
    expect(readEmailVerificationCallbackUrl(new URLSearchParams("callbackURL=https%3A%2F%2Fevil.example"))).toBe("/");
    if (prev === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  });
});

describe("buildTowerVerifyEmailApiUrl", () => {
  it("builds a same-origin API url with an absolute callback for Better Auth originCheck", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    expect(buildTowerVerifyEmailApiUrl("tok", "/dashboard", "https://app.example.com")).toBe(
      "https://app.example.com/api/auth/verify-email?token=tok&callbackURL=https%3A%2F%2Fapp.example.com%2Fdashboard"
    );
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });
});

describe("resolveCheckEmailPromptCopy", () => {
  it("uses invite-specific copy for team invitations", () => {
    const copy = resolveCheckEmailPromptCopy("teamInvite");
    expect(copy.title).toBe("Verify your email to join");
    expect(copy.footerLabel).toBe("Back to invitation");
  });
});

describe("isEmailNotVerifiedAuthError", () => {
  it("matches code and message", () => {
    expect(isEmailNotVerifiedAuthError({ code: "EMAIL_NOT_VERIFIED" })).toBe(true);
    expect(isEmailNotVerifiedAuthError({ message: "Email not verified" })).toBe(true);
    expect(isEmailNotVerifiedAuthError({ code: "INVALID_PASSWORD" })).toBe(false);
  });
});
