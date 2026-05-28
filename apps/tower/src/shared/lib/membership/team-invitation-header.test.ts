import { describe, expect, it } from "vitest";
import { readTeamInvitationIdFromCallbackPath } from "@/shared/lib/membership/team-invitation-header";

describe("readTeamInvitationIdFromCallbackPath", () => {
  it("reads invitationId from team accept callback paths", () => {
    expect(readTeamInvitationIdFromCallbackPath("/invitations/accept?invitationId=inv_123")).toBe("inv_123");
  });

  it("returns null for unrelated callback paths", () => {
    expect(readTeamInvitationIdFromCallbackPath("/team")).toBeNull();
    expect(readTeamInvitationIdFromCallbackPath("/dashboard?invitationId=inv_123")).toBeNull();
  });

  it("returns null when invitationId is missing", () => {
    expect(readTeamInvitationIdFromCallbackPath("/invitations/accept")).toBeNull();
  });
});
