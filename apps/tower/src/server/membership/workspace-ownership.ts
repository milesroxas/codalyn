import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/shared/lib/db";
import { member, organization } from "@/shared/lib/db/auth-schema";

export type WorkspaceOwnerRow = {
  id: string;
  slug: string;
  name: string;
  ownerUserId: string;
  billingOwnerUserId: string | null;
  deletedAt: Date | null;
};

function activeOrganizationCondition() {
  return isNull(organization.deletedAt);
}

export async function loadActiveWorkspaceOwnerRow(organizationId: string): Promise<WorkspaceOwnerRow | null> {
  const [row] = await db
    .select({
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      ownerUserId: organization.ownerUserId,
      billingOwnerUserId: organization.billingOwnerUserId,
      deletedAt: organization.deletedAt,
    })
    .from(organization)
    .where(and(eq(organization.id, organizationId), activeOrganizationCondition()))
    .limit(1);
  return row ?? null;
}

export async function assertUserIsWorkspaceOwner(userId: string, organizationId: string): Promise<WorkspaceOwnerRow> {
  const row = await loadActiveWorkspaceOwnerRow(organizationId);
  if (!row) {
    throw new Error("workspace_not_found");
  }
  if (row.ownerUserId !== userId) {
    throw new Error("forbidden");
  }
  return row;
}

export async function assertUserIsWorkspaceMember(userId: string, organizationId: string): Promise<void> {
  const [membership] = await db
    .select({ id: member.id })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId), activeOrganizationCondition()))
    .limit(1);
  if (!membership) {
    throw new Error("forbidden");
  }
}

/** Membership in a workspace that is not soft-deleted (authoritative for client-supplied organizationId). */
export async function userHasActiveMembershipInOrganization(userId: string, organizationId: string): Promise<boolean> {
  const [membership] = await db
    .select({ id: member.id })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId), activeOrganizationCondition()))
    .limit(1);
  return Boolean(membership);
}
