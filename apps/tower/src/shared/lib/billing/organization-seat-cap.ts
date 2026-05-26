/** Solo workspace cap when `organization.seat_limit` is null (unpaid). Team billing raises the limit via Stripe. */
export const TEAM_UNPAID_SEAT_CAP = 1;

export type OrganizationSeatCapOrg = { seatLimit?: number | null };

export type OrganizationSeatSnapshot = {
  seatsUsed: number;
  effectiveSeatLimit: number;
  /** No remaining seats (includes exactly-at-cap). */
  isAtSeatCap: boolean;
  /** Members + pending invitations exceed the effective cap (e.g. after subscription cancel). */
  isOverSeatCap: boolean;
  seatsRemaining: number;
};

export function resolveMembershipSeatCapFromOrg(org: OrganizationSeatCapOrg): number {
  const raw = org.seatLimit;
  if (raw != null && typeof raw === "number" && !Number.isNaN(raw)) {
    return Math.max(1, raw);
  }
  return TEAM_UNPAID_SEAT_CAP;
}

/** Effective cap + usage from stored `seat_limit` (null → unpaid solo cap). */
export function buildOrganizationSeatSnapshot(
  seatsUsed: number,
  org: OrganizationSeatCapOrg
): OrganizationSeatSnapshot {
  const effectiveSeatLimit = resolveMembershipSeatCapFromOrg(org);
  const isAtSeatCap = seatsUsed >= effectiveSeatLimit;
  return {
    seatsUsed,
    effectiveSeatLimit,
    isAtSeatCap,
    isOverSeatCap: seatsUsed > effectiveSeatLimit,
    seatsRemaining: Math.max(0, effectiveSeatLimit - seatsUsed),
  };
}

/**
 * Better Auth `invitationLimit`: max pending invitations allowed (each pending row consumes a seat).
 * When `pendingCount >= invitationLimit`, invite creation is rejected.
 */
export function resolveOrganizationInvitationLimit(seatsUsed: number, org: OrganizationSeatCapOrg): number {
  return Math.max(0, resolveMembershipSeatCapFromOrg(org) - seatsUsed);
}
