import { and, eq, isNull } from "drizzle-orm";
import { syncOrganizationSeatQuantityWithStripe } from "@/server/billing/stripe-org-seat-sync";
import { db } from "@/shared/lib/db";
import {
  member,
  organization,
  session as sessionTable,
  user,
  workspaceMemberDeparture,
  workspaceOwnershipTransfer,
} from "@/shared/lib/db/auth-schema";

export type WorkspaceLeaveErrorCode = "not_found" | "not_member" | "forbidden" | "workspace_owner" | "billing_owner";

export class WorkspaceLeaveError extends Error {
  readonly code: WorkspaceLeaveErrorCode;

  constructor(code: WorkspaceLeaveErrorCode, message?: string) {
    super(message ?? code);
    this.name = "WorkspaceLeaveError";
    this.code = code;
  }
}

export async function leaveWorkspace(input: { organizationId: string; actorUserId: string }): Promise<void> {
  const organizationId = input.organizationId.trim();
  if (!organizationId) {
    throw new WorkspaceLeaveError("not_found");
  }

  const [orgRow] = await db
    .select({
      id: organization.id,
      ownerUserId: organization.ownerUserId,
      billingOwnerUserId: organization.billingOwnerUserId,
      stripeSubscriptionId: organization.stripeSubscriptionId,
    })
    .from(organization)
    .where(and(eq(organization.id, organizationId), isNull(organization.deletedAt)))
    .limit(1);

  if (!orgRow) {
    throw new WorkspaceLeaveError("not_found");
  }

  if (orgRow.ownerUserId === input.actorUserId) {
    throw new WorkspaceLeaveError(
      "workspace_owner",
      "Workspace owners must transfer ownership or delete the workspace before leaving."
    );
  }

  const hasPaidBilling = Boolean(orgRow.stripeSubscriptionId);
  if (hasPaidBilling && orgRow.billingOwnerUserId === input.actorUserId) {
    throw new WorkspaceLeaveError("billing_owner", "Transfer billing responsibility before leaving this workspace.");
  }

  const [memberRow] = await db
    .select({
      id: member.id,
      role: member.role,
      userId: member.userId,
    })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, input.actorUserId)))
    .limit(1);

  if (!memberRow) {
    throw new WorkspaceLeaveError("not_member");
  }

  const [userRow] = await db
    .select({ email: user.email, name: user.name, preferredOrganizationId: user.preferredOrganizationId })
    .from(user)
    .where(eq(user.id, input.actorUserId))
    .limit(1);

  if (!userRow) {
    throw new WorkspaceLeaveError("forbidden");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(workspaceOwnershipTransfer)
      .set({ status: "canceled", updatedAt: new Date() })
      .where(
        and(
          eq(workspaceOwnershipTransfer.organizationId, organizationId),
          eq(workspaceOwnershipTransfer.toUserId, input.actorUserId),
          eq(workspaceOwnershipTransfer.status, "pending")
        )
      );

    await tx.insert(workspaceMemberDeparture).values({
      id: crypto.randomUUID(),
      organizationId,
      userId: input.actorUserId,
      memberId: memberRow.id,
      userEmail: userRow.email,
      userName: userRow.name,
      role: memberRow.role,
    });

    await tx.delete(member).where(eq(member.id, memberRow.id));

    await tx
      .update(sessionTable)
      .set({ activeOrganizationId: null })
      .where(and(eq(sessionTable.userId, input.actorUserId), eq(sessionTable.activeOrganizationId, organizationId)));

    if (userRow.preferredOrganizationId === organizationId) {
      await tx.update(user).set({ preferredOrganizationId: null }).where(eq(user.id, input.actorUserId));
    }
  });

  await syncOrganizationSeatQuantityWithStripe(organizationId);
}
