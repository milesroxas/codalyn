import { TOWER_INVITATION_STATUS } from "@/shared/lib/membership/tower-invitation-status";

export type InvitationRowActions = {
  resend: boolean;
  revoke: boolean;
  delete: boolean;
  inviteAgain: boolean;
};

/** Which invitation row actions admins may use for a given status. */
export function resolveInvitationRowActions(status: string): InvitationRowActions {
  if (status === TOWER_INVITATION_STATUS.pending) {
    return { resend: true, revoke: true, delete: true, inviteAgain: false };
  }
  if (
    status === TOWER_INVITATION_STATUS.accountDeleted ||
    status === TOWER_INVITATION_STATUS.canceled ||
    status === TOWER_INVITATION_STATUS.rejected
  ) {
    return { resend: false, revoke: false, delete: true, inviteAgain: true };
  }
  if (status === TOWER_INVITATION_STATUS.accepted) {
    return { resend: false, revoke: false, delete: true, inviteAgain: false };
  }
  return { resend: false, revoke: false, delete: true, inviteAgain: false };
}
