import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth-secret", () => ({ resolveAuthSecret: () => "test-secret" }));

import {
  isValidTeamInviteAcceptTokenForEmail,
  signTeamInvitationAcceptToken,
  verifyTeamInvitationAcceptToken,
} from "./team-invitation-accept-token";

describe("team invitation accept token", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("round-trips a valid token (email normalized)", () => {
    const token = signTeamInvitationAcceptToken("inv_1", "User@Example.com");
    expect(verifyTeamInvitationAcceptToken(token)).toEqual({ invitationId: "inv_1", email: "user@example.com" });
    expect(isValidTeamInviteAcceptTokenForEmail(token, "user@example.com")).toBe(true);
  });

  it("rejects an email mismatch", () => {
    const token = signTeamInvitationAcceptToken("inv_1", "user@example.com");
    expect(isValidTeamInviteAcceptTokenForEmail(token, "attacker@example.com")).toBe(false);
  });

  it("rejects a tampered payload / signature", () => {
    const token = signTeamInvitationAcceptToken("inv_1", "user@example.com");
    const [payload, sig] = token.split(".");
    expect(verifyTeamInvitationAcceptToken(`${payload}x.${sig}`)).toBeNull();
    expect(verifyTeamInvitationAcceptToken(`${payload}.${sig}x`)).toBeNull();
    expect(verifyTeamInvitationAcceptToken("garbage")).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signTeamInvitationAcceptToken("inv_1", "user@example.com", 1000);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 5000);
    expect(verifyTeamInvitationAcceptToken(token)).toBeNull();
  });

  it("produces a unique token per issuance (jti)", () => {
    const a = signTeamInvitationAcceptToken("inv_1", "user@example.com");
    const b = signTeamInvitationAcceptToken("inv_1", "user@example.com");
    expect(a).not.toBe(b);
  });

  it("requires invitationId and a valid email at signing", () => {
    expect(() => signTeamInvitationAcceptToken("", "user@example.com")).toThrow();
    expect(() => signTeamInvitationAcceptToken("inv_1", "not-an-email")).toThrow();
  });
});
