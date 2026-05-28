import { and, eq } from "drizzle-orm";
import { db } from "@/shared/lib/db";
import { invitation, member, organization, user } from "@/shared/lib/db/auth-schema";
import type {
  TeamInvitationPreview,
  TeamInvitationPreviewReason,
} from "@/shared/lib/membership/team-invitation-accept";
import { TOWER_INVITATION_STATUS } from "@/shared/lib/membership/tower-invitation-status";

function previewFailure(reason: TeamInvitationPreviewReason, partial?: { organizationName?: string; email?: string }) {
  return {
    ok: false as const,
    reason,
    organizationName: partial?.organizationName,
    email: partial?.email,
  };
}

export async function loadTeamInvitationPreview(invitationId: string): Promise<TeamInvitationPreview> {
  const [row] = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organizationId: invitation.organizationId,
      inviterId: invitation.inviterId,
      organizationName: organization.name,
      inviterName: user.name,
      inviterEmail: user.email,
    })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId, organization.id))
    .innerJoin(user, eq(invitation.inviterId, user.id))
    .where(eq(invitation.id, invitationId))
    .limit(1);

  if (!row) {
    return previewFailure("not_found");
  }

  const partial = {
    organizationName: row.organizationName,
    email: row.email,
  };

  if (row.status !== TOWER_INVITATION_STATUS.pending) {
    return previewFailure("no_longer_pending", partial);
  }

  if (row.expiresAt < new Date()) {
    return previewFailure("expired", partial);
  }

  const [inviterMembership] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.userId, row.inviterId), eq(member.organizationId, row.organizationId)))
    .limit(1);

  if (!inviterMembership) {
    return previewFailure("no_longer_pending", partial);
  }

  const inviterName = row.inviterName?.trim() || row.inviterEmail || "A teammate";
  const role = row.role?.trim() || "member";

  return {
    ok: true,
    organizationName: row.organizationName,
    email: row.email,
    role,
    inviterName,
  };
}
