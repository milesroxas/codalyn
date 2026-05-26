import {
  getDefaultBeaconAppSettings,
  listBeaconPresetStorageEntries,
  mergeOrgTeamSettingsIntoUser,
  parseBeaconAppSettings,
  webflowDataApiUrl,
} from "@codalyn/webflow-kit";
import { and, count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { resolveActiveOrganizationId } from "@/server/resolve-active-organization-id";
import { isTowerTeamAdminMemberOfOrg } from "@/server/tower-webflow-oauth-team-admin";
import { resolveWebflowBearerToken } from "@/server/webflow-proxy-token";
import { db } from "@/shared/lib/db";
import { beaconAppSettings, invitation, member, organization } from "@/shared/lib/db/auth-schema";

export type TowerDashboardSummary = {
  signedIn: boolean;
  userEmail: string | null;
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
  workspaceMemberCount: number | null;
  workspacePendingInviteCount: number | null;
  beaconPresetCount: number | null;
  webflowOAuthConnected: boolean;
  webflowSites: { id: string; displayName?: string }[] | null;
  /**
   * Workspace `admin` / `owner` on the active org (`isTowerTeamAdminMemberOfOrg`).
   * Gates Webflow OAuth controls on the dashboard, member/invitation management UX, and the Team shortcut label.
   */
  activeOrgTeamAdmin: boolean;
};

async function resolveBeaconPresetCount(userId: string, activeOrganizationId: string | null): Promise<number | null> {
  if (!activeOrganizationId) {
    return null;
  }

  const [settingsRows, orgRows] = await Promise.all([
    db
      .select({ payload: beaconAppSettings.payload })
      .from(beaconAppSettings)
      .where(eq(beaconAppSettings.userId, userId))
      .limit(1),
    db
      .select({ beaconTeamSettings: organization.beaconTeamSettings })
      .from(organization)
      .where(eq(organization.id, activeOrganizationId))
      .limit(1),
  ]);

  const userSettings = settingsRows[0]?.payload
    ? parseBeaconAppSettings(settingsRows[0].payload)
    : getDefaultBeaconAppSettings();
  const merged = mergeOrgTeamSettingsIntoUser(userSettings, orgRows[0]?.beaconTeamSettings ?? null);
  return listBeaconPresetStorageEntries(merged.imagePresetStorage).length;
}

async function resolveWorkspaceCounts(activeOrganizationId: string): Promise<{
  memberCount: number;
  pendingInviteCount: number;
}> {
  const [[memberRow], [inviteRow]] = await Promise.all([
    db.select({ total: count() }).from(member).where(eq(member.organizationId, activeOrganizationId)),
    db
      .select({ total: count() })
      .from(invitation)
      .where(and(eq(invitation.organizationId, activeOrganizationId), eq(invitation.status, "pending"))),
  ]);

  return {
    memberCount: memberRow?.total ?? 0,
    pendingInviteCount: inviteRow?.total ?? 0,
  };
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
      workspaceMemberCount: null,
      workspacePendingInviteCount: null,
      beaconPresetCount: null,
      webflowOAuthConnected: false,
      webflowSites: null,
      activeOrgTeamAdmin: false,
    };
  }

  const rawSession = sessionData.session as { id?: string } | undefined;
  const activeOrganizationId = await resolveActiveOrganizationId(userId, rawSession?.id);

  let activeOrganizationName: string | null = null;
  let workspaceMemberCount: number | null = null;
  let workspacePendingInviteCount: number | null = null;
  let beaconPresetCount: number | null = null;

  if (activeOrganizationId) {
    const [orgRows, workspaceCounts, presetCount] = await Promise.all([
      db
        .select({ name: organization.name })
        .from(organization)
        .where(eq(organization.id, activeOrganizationId))
        .limit(1),
      resolveWorkspaceCounts(activeOrganizationId),
      resolveBeaconPresetCount(userId, activeOrganizationId),
    ]);
    activeOrganizationName = orgRows[0]?.name ?? null;
    workspaceMemberCount = workspaceCounts.memberCount;
    workspacePendingInviteCount = workspaceCounts.pendingInviteCount;
    beaconPresetCount = presetCount;
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
    workspaceMemberCount,
    workspacePendingInviteCount,
    beaconPresetCount,
    webflowOAuthConnected,
    webflowSites,
    activeOrgTeamAdmin,
  };
}
