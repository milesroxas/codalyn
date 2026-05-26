import { describe, expect, it } from "vitest";
import { resolveInvitationRowActions } from "@/shared/lib/membership/tower-invitation-actions";
import { TOWER_INVITATION_STATUS } from "@/shared/lib/membership/tower-invitation-status";

describe("resolveInvitationRowActions", () => {
  it("offers resend, revoke, and delete for pending invites", () => {
    expect(resolveInvitationRowActions(TOWER_INVITATION_STATUS.pending)).toEqual({
      resend: true,
      revoke: true,
      delete: true,
      inviteAgain: false,
    });
  });

  it("offers invite again and delete for account_deleted invites", () => {
    expect(resolveInvitationRowActions(TOWER_INVITATION_STATUS.accountDeleted)).toEqual({
      resend: false,
      revoke: false,
      delete: true,
      inviteAgain: true,
    });
  });

  it("offers delete only for accepted invites", () => {
    expect(resolveInvitationRowActions(TOWER_INVITATION_STATUS.accepted)).toEqual({
      resend: false,
      revoke: false,
      delete: true,
      inviteAgain: false,
    });
  });

  it("offers invite again and delete for canceled invites", () => {
    expect(resolveInvitationRowActions(TOWER_INVITATION_STATUS.canceled)).toEqual({
      resend: false,
      revoke: false,
      delete: true,
      inviteAgain: true,
    });
  });
});
