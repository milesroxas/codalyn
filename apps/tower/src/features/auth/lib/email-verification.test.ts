import { describe, expect, it } from "vitest";
import {
  isEmailNotVerifiedAuthError,
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

describe("isEmailNotVerifiedAuthError", () => {
  it("matches code and message", () => {
    expect(isEmailNotVerifiedAuthError({ code: "EMAIL_NOT_VERIFIED" })).toBe(true);
    expect(isEmailNotVerifiedAuthError({ message: "Email not verified" })).toBe(true);
    expect(isEmailNotVerifiedAuthError({ code: "INVALID_PASSWORD" })).toBe(false);
  });
});
