import { describe, expect, it } from "vitest";
import { messageForTowerEmailSignInError } from "@/features/auth/lib/tower-email-sign-in";

describe("messageForTowerEmailSignInError", () => {
  it("flags unverified email by code or message", () => {
    expect(messageForTowerEmailSignInError({ code: "EMAIL_NOT_VERIFIED" })).toMatch(/verify your email/i);
    expect(messageForTowerEmailSignInError({ message: "Email not verified" })).toMatch(/verify your email/i);
  });

  it("flags bad credentials by code, status, or message", () => {
    expect(messageForTowerEmailSignInError({ code: "INVALID_EMAIL_OR_PASSWORD" })).toMatch(/incorrect/i);
    expect(messageForTowerEmailSignInError({ status: 401 })).toMatch(/incorrect/i);
    expect(messageForTowerEmailSignInError({ message: "Invalid email or password" })).toMatch(/incorrect/i);
  });

  it("falls back to the raw message, then a generic message", () => {
    expect(messageForTowerEmailSignInError({ message: "Server exploded" })).toBe("Server exploded");
    expect(messageForTowerEmailSignInError(null)).toMatch(/try again/i);
    expect(messageForTowerEmailSignInError({})).toMatch(/try again/i);
  });
});
