import { eq } from "drizzle-orm";
import { syncOrganizationSeatQuantityWithStripe } from "@/server/billing/stripe-org-seat-sync";
import { isTowerTeamAdminMemberOfOrg } from "@/server/tower-webflow-oauth-team-admin";
import { db } from "@/shared/lib/db";
import { invitation } from "@/shared/lib/db/auth-schema";
import { TOWER_INVITATION_STATUS } from "@/shared/lib/membership/tower-invitation-status";

export class InvitationDeletionError extends Error {
  readonly code: "not_found" | "forbidden" | "org_mismatch";

  constructor(code: InvitationDeletionError["code"]) {
    super(code);
    this.name = "InvitationDeletionError";
    this.code = code;
  }
}

export async function deleteTeamInvitation(input: {
  invitationId: string;
  organizationId: string;
  actorUserId: string;
}): Promise<void> {
  const { invitationId, organizationId, actorUserId } = input;

  if (!(await isTowerTeamAdminMemberOfOrg(actorUserId, organizationId))) {
    throw new InvitationDeletionError("forbidden");
  }

  const [row] = await db
    .select({
      id: invitation.id,
      organizationId: invitation.organizationId,
      status: invitation.status,
    })
    .from(invitation)
    .where(eq(invitation.id, invitationId))
    .limit(1);

  if (!row) {
    throw new InvitationDeletionError("not_found");
  }
  if (row.organizationId !== organizationId) {
    throw new InvitationDeletionError("org_mismatch");
  }

  const wasPending = row.status === TOWER_INVITATION_STATUS.pending;

  await db.delete(invitation).where(eq(invitation.id, invitationId));

  if (wasPending) {
    await syncOrganizationSeatQuantityWithStripe(organizationId);
  }
}
