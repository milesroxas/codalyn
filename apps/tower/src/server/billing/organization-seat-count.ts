import { and, count, eq } from "drizzle-orm";
import { getTeamMinSeats } from "@/server/billing/team-billing-config";
import { db } from "@/shared/lib/db";
import { invitation, member } from "@/shared/lib/db/auth-schema";

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
