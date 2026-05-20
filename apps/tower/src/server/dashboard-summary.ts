import { webflowDataApiUrl } from "@codalyn/webflow-kit";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { isTowerTeamAdminMemberOfOrg } from "@/server/tower-webflow-oauth-team-admin";
import { resolveWebflowBearerToken } from "@/server/webflow-proxy-token";
import { db } from "@/shared/lib/db";
import { member, organization, session as sessionTable, user } from "@/shared/lib/db/auth-schema";

export type TowerDashboardSummary = {
  signedIn: boolean;
  userEmail: string | null;
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
  webflowOAuthConnected: boolean;
  webflowSites: { id: string; displayName?: string }[] | null;
  /**
   * Workspace `admin` / `owner` on the active org (`isTowerTeamAdminMemberOfOrg`).
   * Gates Webflow OAuth controls on the dashboard, member/invitation management UX, and the Team shortcut label.
   */
  activeOrgTeamAdmin: boolean;
};

async function resolveActiveOrganizationId(userId: string, rawSessionId?: string): Promise<string | null> {
  if (rawSessionId) {
    const rows = await db
      .select({ activeOrganizationId: sessionTable.activeOrganizationId })
      .from(sessionTable)
      .where(eq(sessionTable.id, rawSessionId))
      .limit(1);
    const sessionActiveOrgId = rows[0]?.activeOrganizationId ?? null;
    if (sessionActiveOrgId) {
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
  if (recentSessionActiveOrgId) {
    return recentSessionActiveOrgId;
  }

  const [preferredRow, orgRows] = await Promise.all([
    db.select({ preferredOrganizationId: user.preferredOrganizationId }).from(user).where(eq(user.id, userId)).limit(1),
    db
      .select({ id: organization.id, name: organization.name })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, userId))
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

export async function getTowerDashboardSummary(): Promise<TowerDashboardSummary> {
  const sessionData = await auth.api.getSession({ headers: await headers() });
  const userId = sessionData?.user?.id;
  const userEmail = typeof sessionData?.user?.email === "string" ? sessionData.user.email : null;

  if (!userId) {
    return {
      signedIn: false,
      userEmail: null,
      activeOrganizationId: null,
      activeOrganizationName: null,
      webflowOAuthConnected: false,
      webflowSites: null,
      activeOrgTeamAdmin: false,
    };
  }

  const rawSession = sessionData.session as { id?: string } | undefined;
  const activeOrganizationId = await resolveActiveOrganizationId(userId, rawSession?.id);

  let activeOrganizationName: string | null = null;
  if (activeOrganizationId) {
    const orgRows = await db
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, activeOrganizationId))
      .limit(1);
    activeOrganizationName = orgRows[0]?.name ?? null;
  }

  const activeOrgTeamAdmin = activeOrganizationId
    ? await isTowerTeamAdminMemberOfOrg(userId, activeOrganizationId)
    : false;

  const token = await resolveWebflowBearerToken({ userId, requestHeaders: await headers() });
  const webflowOAuthConnected = Boolean(token);

  let webflowSites: { id: string; displayName?: string }[] | null = null;
  if (token) {
    const url = webflowDataApiUrl(["sites"]);
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (res.ok) {
      const json = (await res.json()) as { sites?: { id: string; displayName?: string }[] };
      webflowSites = json.sites ?? [];
    } else {
      webflowSites = [];
    }
  }

  return {
    signedIn: true,
    userEmail,
    activeOrganizationId,
    activeOrganizationName,
    webflowOAuthConnected,
    webflowSites,
    activeOrgTeamAdmin,
  };
}
