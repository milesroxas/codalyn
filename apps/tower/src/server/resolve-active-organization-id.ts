import { and, asc, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/shared/lib/db";
import { member, organization, session as sessionTable, user } from "@/shared/lib/db/auth-schema";

async function isActiveOrganizationId(organizationId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(and(eq(organization.id, organizationId), isNull(organization.deletedAt)))
    .limit(1);
  return Boolean(row);
}

/**
 * Single source of truth for active Tower workspace on a session.
 * Used by dashboard summary, Beacon membership APIs, billing/Webflow routes (`getActiveOrganizationIdForAuthHeaders`).
 * Falls back to preferred org, then first membership, and persists on the current session when possible.
 */
export async function resolveActiveOrganizationId(userId: string, rawSessionId?: string): Promise<string | null> {
  if (rawSessionId) {
    const rows = await db
      .select({ activeOrganizationId: sessionTable.activeOrganizationId })
      .from(sessionTable)
      .where(eq(sessionTable.id, rawSessionId))
      .limit(1);
    const sessionActiveOrgId = rows[0]?.activeOrganizationId ?? null;
    if (sessionActiveOrgId && (await isActiveOrganizationId(sessionActiveOrgId))) {
      return sessionActiveOrgId;
    }
  }

  const recentSessionRows = await db
    .select({ activeOrganizationId: sessionTable.activeOrganizationId })
    .from(sessionTable)
    .where(and(eq(sessionTable.userId, userId), gt(sessionTable.expiresAt, new Date())))
    .orderBy(desc(sessionTable.updatedAt))
    .limit(1);
  const recentSessionActiveOrgId = recentSessionRows[0]?.activeOrganizationId ?? null;
  if (recentSessionActiveOrgId && (await isActiveOrganizationId(recentSessionActiveOrgId))) {
    return recentSessionActiveOrgId;
  }

  const [preferredRow, orgRows] = await Promise.all([
    db.select({ preferredOrganizationId: user.preferredOrganizationId }).from(user).where(eq(user.id, userId)).limit(1),
    db
      .select({ id: organization.id, name: organization.name })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(and(eq(member.userId, userId), isNull(organization.deletedAt)))
      .orderBy(asc(organization.name)),
  ]);
  const preferredOrganizationId = preferredRow[0]?.preferredOrganizationId ?? null;
  const fallbackOrgId =
    (preferredOrganizationId && orgRows.find((row) => row.id === preferredOrganizationId)?.id) ??
    orgRows[0]?.id ??
    null;
  if (fallbackOrgId && rawSessionId) {
    await db.update(sessionTable).set({ activeOrganizationId: fallbackOrgId }).where(eq(sessionTable.id, rawSessionId));
  }
  return fallbackOrgId;
}
