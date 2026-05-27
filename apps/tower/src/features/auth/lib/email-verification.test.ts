import { describe, expect, it } from "vitest";
import {
  isEmailNotVerifiedAuthError,
  readEmailVerificationCallbackUrl,
  resolveTowerAppCallbackUrl,
  resolveTowerEmailVerificationAppCallbackUrl,
  resolveTowerEmailVerificationCallbackUrl,
} from "@/features/auth/lib/email-verification";

describe("resolveTowerEmailVerificationCallbackUrl", () => {
  it("adds emailVerified query and rejects open redirects", () => {
    expect(resolveTowerEmailVerificationCallbackUrl("/dashboard")).toBe("/dashboard?emailVerified=1");
    expect(resolveTowerEmailVerificationCallbackUrl("//evil.example")).toBe("/?emailVerified=1");
    expect(resolveTowerEmailVerificationCallbackUrl("https://evil.example")).toBe("/?emailVerified=1");
  });
});

describe("resolveTowerEmailVerificationAppCallbackUrl", () => {
  it("composes absolute url from env base when set", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    expect(resolveTowerEmailVerificationAppCallbackUrl("/billing")).toBe(
      "https://app.example.com/billing?emailVerified=1"
    );
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
  it("accepts same-origin absolute callback URLs", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    expect(
      readEmailVerificationCallbackUrl(
        new URLSearchParams("callbackURL=https%3A%2F%2Fapp.example.com%2Fbilling%3FemailVerified%3D1")
      )
    ).toBe("/billing?emailVerified=1");
    if (prev === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  });

  it("falls back to a safe default for missing or invalid callbacks", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(readEmailVerificationCallbackUrl(new URLSearchParams())).toBe("/?emailVerified=1");
    expect(readEmailVerificationCallbackUrl(new URLSearchParams("callbackURL=https%3A%2F%2Fevil.example"))).toBe(
      "/?emailVerified=1"
    );
    if (prev === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  });
});

describe("isEmailNotVerifiedAuthError", () => {
  it("matches code and message", () => {
    expect(isEmailNotVerifiedAuthError({ code: "EMAIL_NOT_VERIFIED" })).toBe(true);
    expect(isEmailNotVerifiedAuthError({ message: "Email not verified" })).toBe(true);
    expect(isEmailNotVerifiedAuthError({ code: "INVALID_PASSWORD" })).toBe(false);
  });
});
