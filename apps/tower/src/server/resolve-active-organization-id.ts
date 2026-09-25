import { and, asc, desc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/shared/lib/db";
import { member, organization, session as sessionTable, user } from "@/shared/lib/db/auth-schema";

/**
 * The organization exists, is not soft-deleted, and `userId` is still a member of it.
 *
 * A session's `activeOrganizationId` is a pointer the user set earlier; an admin can have removed them
 * since, and Better Auth clears the pointer only when the remover is the member themself. Membership,
 * not the pointer, is what carries authority over the workspace's Webflow token, settings and billing
 * (Marketplace guidelines: "Gate every write and delete operation behind authenticated, verified
 * triggers"), so a stale pointer resolves to nothing and the caller falls back or refuses.
 */
async function isLiveMembership(userId: string, organizationId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: member.id })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId), isNull(organization.deletedAt)))
    .limit(1);
  return Boolean(row);
}

/**
 * What happens when neither the current session nor any live session of the user holds a workspace.
 *
 * - `"memberships"` — Tower's own web (cookie) sessions: default to the preferred organization, else
 *   the first membership, and persist that default on the current session.
 * - `"none"` — Designer Extension (bearer) sessions: no default and no write. Beacon holds a
 *   single-workspace default locally and persists it only through `POST /api/v1/beacon/active-workspace`
 *   from the user's explicit "Use this workspace" confirmation (Marketplace review round 8,
 *   "Workspace state persisted without explicit user interaction", 2026-09-17).
 */
export type ActiveOrganizationFallback = "memberships" | "none";

/**
 * Single source of truth for active Tower workspace on a session.
 * Used by dashboard summary, Beacon membership APIs, billing/Webflow routes (`getActiveOrganizationIdForAuthHeaders`).
 * Reads the session's own workspace, then the most recent live session that holds one — each accepted
 * only while the user is still a member of it — and what happens after that is the caller's `fallback`
 * (see {@link ActiveOrganizationFallback}).
 *
 * Request-memoized via `cache()` (keyed by user + session + fallback) so the layout, dashboard, and billing
 * surfaces share one resolution per render instead of repeating these queries (and the fallback write).
 */
export const resolveActiveOrganizationId = cache(async function resolveActiveOrganizationId(
  userId: string,
  rawSessionId?: string,
  fallback: ActiveOrganizationFallback = "memberships"
): Promise<string | null> {
  if (rawSessionId) {
    const rows = await db
      .select({ activeOrganizationId: sessionTable.activeOrganizationId })
      .from(sessionTable)
      .where(eq(sessionTable.id, rawSessionId))
      .limit(1);
    const sessionActiveOrgId = rows[0]?.activeOrganizationId ?? null;
    if (sessionActiveOrgId && (await isLiveMembership(userId, sessionActiveOrgId))) {
      return sessionActiveOrgId;
    }
  }

  // Only sessions that actually hold a workspace count here: a just-minted session (e.g. the
  // Designer id-token exchange) is the newest row but has a null org, and without this filter it
  // shadows the Tower browser session the user opened the Designer from — sending them to the
  // preferred/alphabetical fallback instead of the workspace they came from.
  const recentSessionRows = await db
    .select({ activeOrganizationId: sessionTable.activeOrganizationId })
    .from(sessionTable)
    .where(
      and(
        eq(sessionTable.userId, userId),
        gt(sessionTable.expiresAt, new Date()),
        isNotNull(sessionTable.activeOrganizationId)
      )
    )
    .orderBy(desc(sessionTable.updatedAt))
    .limit(1);
  const recentSessionActiveOrgId = recentSessionRows[0]?.activeOrganizationId ?? null;
  if (recentSessionActiveOrgId && (await isLiveMembership(userId, recentSessionActiveOrgId))) {
    return recentSessionActiveOrgId;
  }

  if (fallback === "none") {
    return null;
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
});
