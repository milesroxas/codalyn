import { APIError } from "better-auth/api";
import { and, count, eq } from "drizzle-orm";
import { getTeamMinSeats, resolveMembershipSeatCapFromOrg } from "@/server/billing/team-billing-config";
import { db } from "@/shared/lib/db";
import { invitation, member, organization } from "@/shared/lib/db/auth-schema";

export type OrganizationSeatSnapshot = {
  seatsUsed: number;
  effectiveSeatLimit: number;
  isAtSeatCap: boolean;
};

/** Effective cap + usage from stored `seat_limit` (null → unpaid solo cap). */
export function buildOrganizationSeatSnapshot(
  seatsUsed: number,
  org: { seatLimit?: number | null }
): OrganizationSeatSnapshot {
  const effectiveSeatLimit = resolveMembershipSeatCapFromOrg(org);
  return {
    seatsUsed,
    effectiveSeatLimit,
    isAtSeatCap: seatsUsed >= effectiveSeatLimit,
  };
}

/** Members plus pending invitations (each consumes a seat). */
export async function countOrganizationSeatsUsed(organizationId: string): Promise<number> {
  const [[memberRow], [inviteRow]] = await Promise.all([
    db.select({ total: count() }).from(member).where(eq(member.organizationId, organizationId)),
    db
      .select({ total: count() })
      .from(invitation)
      .where(and(eq(invitation.organizationId, organizationId), eq(invitation.status, "pending"))),
  ]);
  return (memberRow?.total ?? 0) + (inviteRow?.total ?? 0);
}

/** Seat quantity for Stripe checkout or subscription sync (never below team minimum). */
export async function resolveOrganizationSeatQuantity(organizationId: string): Promise<number> {
  const used = await countOrganizationSeatsUsed(organizationId);
  return Math.max(getTeamMinSeats(), used);
}

/**
 * Server gate: members + pending invitations must stay below the effective cap.
 * Better Auth `membershipLimit` counts members only on invite accept — this closes the invite/create gap.
 */
export async function assertOrganizationSeatAvailable(
  organizationId: string,
  org?: { seatLimit?: number | null }
): Promise<void> {
  const orgRow =
    org ??
    (
      await db
        .select({ seatLimit: organization.seatLimit })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1)
    )[0];

  if (!orgRow) {
    throw new APIError("BAD_REQUEST", { message: "Organization not found" });
  }

  const seatsUsed = await countOrganizationSeatsUsed(organizationId);
  const cap = resolveMembershipSeatCapFromOrg(orgRow);
  if (seatsUsed >= cap) {
    throw new APIError("FORBIDDEN", {
      message:
        "This workspace has reached its seat limit. Subscribe to Team billing, remove a member, or revoke a pending invite.",
    });
  }
}
