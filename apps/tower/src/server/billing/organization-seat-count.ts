import { APIError } from "better-auth/api";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { getTeamMinSeats } from "@/server/billing/team-billing-config";
import { resolveSeatFloor } from "@/server/billing/team-seat-quantity";
import {
  buildOrganizationSeatSnapshot,
  type OrganizationSeatCapOrg,
  resolveOrganizationInvitationLimit,
} from "@/shared/lib/billing/organization-seat-cap";
import { db } from "@/shared/lib/db";
import { invitation, member, organization } from "@/shared/lib/db/auth-schema";

export type { OrganizationSeatSnapshot } from "@/shared/lib/billing/organization-seat-cap";

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

/** Batch seat usage for operator lists (avoids N+1). */
export async function countOrganizationSeatsUsedBatch(organizationIds: string[]): Promise<Map<string, number>> {
  if (organizationIds.length === 0) {
    return new Map();
  }

  const [memberRows, inviteRows] = await Promise.all([
    db
      .select({
        organizationId: member.organizationId,
        total: count(),
      })
      .from(member)
      .where(inArray(member.organizationId, organizationIds))
      .groupBy(member.organizationId),
    db
      .select({
        organizationId: invitation.organizationId,
        total: count(),
      })
      .from(invitation)
      .where(and(inArray(invitation.organizationId, organizationIds), eq(invitation.status, "pending")))
      .groupBy(invitation.organizationId),
  ]);

  const totals = new Map<string, number>();
  for (const id of organizationIds) {
    totals.set(id, 0);
  }
  for (const row of memberRows) {
    totals.set(row.organizationId, (totals.get(row.organizationId) ?? 0) + Number(row.total ?? 0));
  }
  for (const row of inviteRows) {
    totals.set(row.organizationId, (totals.get(row.organizationId) ?? 0) + Number(row.total ?? 0));
  }
  return totals;
}

/** Billable seat floor for a workspace: never below the team minimum or current usage. */
export async function resolveOrganizationSeatQuantity(organizationId: string): Promise<number> {
  const used = await countOrganizationSeatsUsed(organizationId);
  return resolveSeatFloor(getTeamMinSeats(), used);
}

/** Better Auth `invitationLimit` — pending invites allowed before at-cap rejection. */
export async function resolveOrganizationInvitationLimitForOrg(
  organizationId: string,
  org?: OrganizationSeatCapOrg
): Promise<number> {
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
    return 0;
  }

  const seatsUsed = await countOrganizationSeatsUsed(organizationId);
  return resolveOrganizationInvitationLimit(seatsUsed, orgRow);
}

/**
 * Server gate: members + pending invitations must stay below the effective cap.
 * Better Auth `membershipLimit` counts members only on invite accept — this closes the invite/create gap.
 */
export async function assertOrganizationSeatAvailable(
  organizationId: string,
  org?: OrganizationSeatCapOrg
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
  const snapshot = buildOrganizationSeatSnapshot(seatsUsed, orgRow);
  if (snapshot.isAtSeatCap) {
    throw new APIError("FORBIDDEN", {
      message:
        "This workspace has reached its seat limit. Subscribe to Team billing, remove a member, or revoke a pending invite.",
    });
  }
}

/** A member or invitation row just inserted by Better Auth, to roll back if it breached the seat cap. */
export type SeatCreatedRow = { kind: "invitation" | "member"; id: string };

/**
 * Closes the count-then-insert race on seat caps. Better Auth inserts the member/invitation *outside*
 * the `before*` seat check, so two concurrent creates at cap−1 can both pass and exceed the cap by one.
 * Run this in the matching `after*` hook: it serializes per-organization with a transaction advisory
 * lock (mirroring the metering pattern), recounts members + pending invites, and rolls back the
 * just-created row when it pushed the workspace over its seat cap — then raises the same at-cap error.
 */
export async function assertSeatCapNotExceededAfterCreate(
  organizationId: string,
  created: SeatCreatedRow
): Promise<void> {
  const rolledBack = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock((hashtext(${`org-seat|${organizationId}`}::text))::bigint)`);

    const [orgRow] = await tx
      .select({ seatLimit: organization.seatLimit })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);
    if (!orgRow) {
      return false;
    }

    const [[memberRow], [inviteRow]] = await Promise.all([
      tx.select({ total: count() }).from(member).where(eq(member.organizationId, organizationId)),
      tx
        .select({ total: count() })
        .from(invitation)
        .where(and(eq(invitation.organizationId, organizationId), eq(invitation.status, "pending"))),
    ]);
    const seatsUsed = (memberRow?.total ?? 0) + (inviteRow?.total ?? 0);

    if (!buildOrganizationSeatSnapshot(seatsUsed, orgRow).isOverSeatCap) {
      return false;
    }

    if (created.kind === "invitation") {
      await tx.delete(invitation).where(eq(invitation.id, created.id));
    } else {
      await tx.delete(member).where(eq(member.id, created.id));
    }
    return true;
  });

  if (rolledBack) {
    throw new APIError("FORBIDDEN", {
      message:
        "This workspace has reached its seat limit. Subscribe to Team billing, remove a member, or revoke a pending invite.",
    });
  }
}

/** Blocks accepting invites while the workspace is over cap (e.g. after Team subscription cancel). */
export async function assertOrganizationNotOverSeatCap(
  organizationId: string,
  org?: OrganizationSeatCapOrg
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
  const snapshot = buildOrganizationSeatSnapshot(seatsUsed, orgRow);
  if (snapshot.isOverSeatCap) {
    throw new APIError("FORBIDDEN", {
      message:
        "This workspace exceeds its seat limit. Remove members or resubscribe to Team billing before accepting invitations.",
    });
  }
}
