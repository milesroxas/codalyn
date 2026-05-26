import { describe, expect, it } from "vitest";
import {
  isChangeEmailVerificationRequest,
  readEmailVerificationTokenPayload,
  rewriteVerifyEmailCallbackUrl,
} from "@/server/auth/email-verification-token";

function encodePayload(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

describe("readEmailVerificationTokenPayload", () => {
  it("reads canonical Better Auth payload", () => {
    const token = encodePayload({
      email: "old@example.com",
      updateTo: "new@example.com",
      requestType: "change-email-verification",
    });
    expect(readEmailVerificationTokenPayload(token)).toEqual({
      email: "old@example.com",
      updateTo: "new@example.com",
      requestType: "change-email-verification",
    });
  });

  it("returns null fields for malformed token", () => {
    expect(readEmailVerificationTokenPayload("not-a-jwt")).toEqual({
      email: null,
      updateTo: null,
      requestType: null,
    });
    expect(readEmailVerificationTokenPayload(encodePayload({ email: 1, requestType: false }))).toEqual({
      email: null,
      updateTo: null,
      requestType: null,
    });
  });
});

describe("isChangeEmailVerificationRequest", () => {
  it("matches change-email-verification only", () => {
    const token = encodePayload({ requestType: "change-email-verification" });
    expect(isChangeEmailVerificationRequest(token)).toBe(true);
    expect(isChangeEmailVerificationRequest(encodePayload({ requestType: "change-email-confirmation" }))).toBe(false);
  });
});

describe("rewriteVerifyEmailCallbackUrl", () => {
  it("replaces callbackURL query param", () => {
    const next = rewriteVerifyEmailCallbackUrl(
      "https://tower.example.com/api/auth/verify-email?token=abc&callbackURL=%2Faccount",
      "https://tower.example.com/account?emailChanged=1"
    );
    expect(next).toBe(
      "https://tower.example.com/api/auth/verify-email?token=abc&callbackURL=https%3A%2F%2Ftower.example.com%2Faccount%3FemailChanged%3D1"
    );
  });
});
