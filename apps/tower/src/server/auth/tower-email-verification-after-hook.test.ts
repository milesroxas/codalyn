import { describe, expect, it } from "vitest";
import { shouldSetTowerEmailVerifiedFlashAfterVerifyEmail } from "@/server/auth/tower-email-verification-after-hook";

function encodePayload(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

describe("shouldSetTowerEmailVerifiedFlashAfterVerifyEmail", () => {
  it("sets flash only for successful standard email verification redirects", () => {
    expect(
      shouldSetTowerEmailVerifiedFlashAfterVerifyEmail({
        path: "/verify-email",
        token: "plain-token",
        redirectLocation: "https://tower.example.com/dashboard",
      })
    ).toBe(true);
    expect(
      shouldSetTowerEmailVerifiedFlashAfterVerifyEmail({
        path: "/verify-email",
        token: "plain-token",
        redirectLocation: "/invitations/accept?invitationId=abc",
      })
    ).toBe(true);
  });

  it("skips non verify-email paths", () => {
    expect(
      shouldSetTowerEmailVerifiedFlashAfterVerifyEmail({
        path: "/sign-in/email",
        token: "plain-token",
        redirectLocation: "/",
      })
    ).toBe(false);
  });

  it("skips change-email verification and failed redirects", () => {
    const changeEmailToken = encodePayload({ requestType: "change-email-verification" });
    expect(
      shouldSetTowerEmailVerifiedFlashAfterVerifyEmail({
        path: "/verify-email",
        token: changeEmailToken,
        redirectLocation: "/account?emailChanged=1",
      })
    ).toBe(false);
    expect(
      shouldSetTowerEmailVerifiedFlashAfterVerifyEmail({
        path: "/verify-email",
        token: "plain-token",
        redirectLocation: "/?error=invalid_token",
      })
    ).toBe(false);
    expect(
      shouldSetTowerEmailVerifiedFlashAfterVerifyEmail({
        path: "/verify-email",
        token: "plain-token",
        redirectLocation: null,
      })
    ).toBe(false);
  });
});
