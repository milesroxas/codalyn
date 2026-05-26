/** Invitation statuses persisted by Better Auth plus Tower-specific lifecycle values. */
export const TOWER_INVITATION_STATUS = {
  pending: "pending",
  accepted: "accepted",
  canceled: "canceled",
  rejected: "rejected",
  /** Invitee accepted, then deleted their Tower account; seat is released. */
  accountDeleted: "account_deleted",
} as const;

export type TowerInvitationStatus = (typeof TOWER_INVITATION_STATUS)[keyof typeof TOWER_INVITATION_STATUS];

export function formatTowerInvitationStatusLabel(status: string): string {
  if (status === TOWER_INVITATION_STATUS.accountDeleted) {
    return "Account deleted";
  }
  return status.replaceAll("_", " ");
}

export function towerInvitationBadgeVariant(status: string): "outline" | "secondary" | "destructive" {
  if (status === TOWER_INVITATION_STATUS.pending) {
    return "outline";
  }
  if (status === TOWER_INVITATION_STATUS.accepted) {
    return "secondary";
  }
  if (status === TOWER_INVITATION_STATUS.accountDeleted) {
    return "destructive";
  }
  return "destructive";
}
