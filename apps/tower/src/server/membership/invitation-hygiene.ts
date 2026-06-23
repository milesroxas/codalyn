import { and, eq, ne, sql } from "drizzle-orm";
import { syncOrganizationSeatQuantityWithStripe } from "@/server/billing/stripe-org-seat-sync";
import { normalizeAccessEmail } from "@/shared/lib/access/email-input";
import { db } from "@/shared/lib/db";
import { invitation } from "@/shared/lib/db/auth-schema";
import { TOWER_INVITATION_STATUS } from "@/shared/lib/membership/tower-invitation-status";

/**
 * Cancels every still-pending invitation addressed to an email. Run when the email's account is
 * deleted: a stranger who later claims the freed address must not silently inherit live invites,
 * and the seats those pending invites held are released back to each workspace.
 */
export async function cancelPendingInvitationsForEmail(email: string): Promise<void> {
  const normalizedEmail = normalizeAccessEmail(email);
  if (!normalizedEmail) {
    return;
  }

  const pendingMatch = and(
    sql`lower(${invitation.email}) = ${normalizedEmail}`,
    eq(invitation.status, TOWER_INVITATION_STATUS.pending)
  );

  const pending = await db.select({ organizationId: invitation.organizationId }).from(invitation).where(pendingMatch);
  if (pending.length === 0) {
    return;
  }

  await db.update(invitation).set({ status: TOWER_INVITATION_STATUS.canceled }).where(pendingMatch);

  const organizationIds = [...new Set(pending.map((row) => row.organizationId))];
  await Promise.all(organizationIds.map((organizationId) => syncOrganizationSeatQuantityWithStripe(organizationId)));
}

/**
 * Removes `account_deleted` ghost invitation rows for an email in one workspace. Run on re-invite so
 * a member who deleted and rejoined is not shadowed by a permanent "Account deleted" row in the team
 * list. Pass the freshly-created invitation id to avoid touching it.
 */
export async function clearAccountDeletedInvitationGhosts(input: {
  organizationId: string;
  email: string;
  exceptInvitationId?: string;
}): Promise<void> {
  const normalizedEmail = normalizeAccessEmail(input.email);
  if (!normalizedEmail) {
    return;
  }

  await db
    .delete(invitation)
    .where(
      and(
        eq(invitation.organizationId, input.organizationId),
        sql`lower(${invitation.email}) = ${normalizedEmail}`,
        eq(invitation.status, TOWER_INVITATION_STATUS.accountDeleted),
        ...(input.exceptInvitationId ? [ne(invitation.id, input.exceptInvitationId)] : [])
      )
    );
}
