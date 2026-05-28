import { describe, expect, it } from "vitest";
import {
  buildTeamInvitationAcceptPath,
  classifyTeamInvitationAcceptError,
  isTeamInvitationAcceptPath,
  messageForTeamInvitationAcceptError,
} from "@/shared/lib/membership/team-invitation-accept";

describe("isTeamInvitationAcceptPath", () => {
  it("matches invitation accept callback paths", () => {
    expect(isTeamInvitationAcceptPath("/invitations/accept?invitationId=abc")).toBe(true);
    expect(isTeamInvitationAcceptPath("/team")).toBe(false);
  });
});

describe("buildTeamInvitationAcceptPath", () => {
  it("builds a stable accept URL", () => {
    expect(buildTeamInvitationAcceptPath("inv_123")).toBe("/invitations/accept?invitationId=inv_123");
  });
});

describe("classifyTeamInvitationAcceptError", () => {
  it("maps Better Auth organization invitation errors", () => {
    expect(
      classifyTeamInvitationAcceptError({
        code: "EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION",
      })
    ).toBe("email_verification_required");
    expect(classifyTeamInvitationAcceptError({ code: "YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION" })).toBe(
      "email_mismatch"
    );
    expect(classifyTeamInvitationAcceptError({ message: "Invitation not found" })).toBe("invitation_unavailable");
  });
});

describe("messageForTeamInvitationAcceptError", () => {
  it("returns user-facing guidance", () => {
    expect(messageForTeamInvitationAcceptError("seat_limit")).toContain("open seats");
    expect(messageForTeamInvitationAcceptError("unknown", "Server exploded")).toBe("Server exploded");
  });
});
