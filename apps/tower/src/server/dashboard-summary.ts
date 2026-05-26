import {
  getDefaultBeaconAppSettings,
  listBeaconPresetStorageEntries,
  mergeOrgTeamSettingsIntoUser,
  parseBeaconAppSettings,
} from "@codalyn/webflow-kit";
import { and, count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { isTowerProductAdmin } from "@/server/membership/product-admin";
import { resolveActiveOrganizationId } from "@/server/resolve-active-organization-id";
import { isTowerTeamAdminMemberOfOrg } from "@/server/tower-webflow-oauth-team-admin";
import { resolveWebflowBearerToken } from "@/server/webflow-proxy-token";
import { listWebflowSitesForUser, type WebflowSiteSummary } from "@/server/webflow-sites";
import { db } from "@/shared/lib/db";
import { beaconAppSettings, invitation, member, organization } from "@/shared/lib/db/auth-schema";

export type TowerDashboardSummary = {
  signedIn: boolean;
  userEmail: string | null;
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
  /** Workspaces this user belongs to (any role). */
  workspaceMembershipCount: number;
  canCreateOrganization: boolean;
  workspaceMemberCount: number | null;
  workspacePendingInviteCount: number | null;
  beaconPresetCount: number | null;
  webflowOAuthConnected: boolean;
  webflowSites: WebflowSiteSummary[] | null;
  /**
   * Workspace `admin` / `owner` on the active org (`isTowerTeamAdminMemberOfOrg`).
   * Gates Webflow OAuth controls on the dashboard, member/invitation management UX, and the Team shortcut label.
   */
  activeOrgTeamAdmin: boolean;
};

type GetTowerDashboardSummaryOptions = {
  /** When false, skips the outbound Webflow sites API call (dashboard overview). */
  includeWebflowSites?: boolean;
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

export async function getTowerDashboardSummary(
  options: GetTowerDashboardSummaryOptions = {}
): Promise<TowerDashboardSummary> {
  const includeWebflowSites = options.includeWebflowSites ?? false;
  const requestHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: requestHeaders });
  const userId = sessionData?.user?.id;
  const userEmail = typeof sessionData?.user?.email === "string" ? sessionData.user.email : null;

  if (!userId) {
    return {
      signedIn: false,
      userEmail: null,
      activeOrganizationId: null,
      activeOrganizationName: null,
      workspaceMembershipCount: 0,
      canCreateOrganization: false,
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

  const [membershipRow] = await db.select({ total: count() }).from(member).where(eq(member.userId, userId));
  const workspaceMembershipCount = membershipRow?.total ?? 0;
  const canCreateOrganization =
    isTowerProductAdmin(sessionData.user) ||
    Boolean((sessionData.user as { canCreateOrganization?: boolean }).canCreateOrganization);

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

  const token = await resolveWebflowBearerToken({ userId, requestHeaders });
  const webflowOAuthConnected = Boolean(token);

  const webflowSites =
    includeWebflowSites && token ? await listWebflowSitesForUser({ userId, requestHeaders, accessToken: token }) : null;

  return {
    signedIn: true,
    userEmail,
    activeOrganizationId,
    activeOrganizationName,
    workspaceMembershipCount,
    canCreateOrganization,
    workspaceMemberCount,
    workspacePendingInviteCount,
    beaconPresetCount,
    webflowOAuthConnected,
    webflowSites,
    activeOrgTeamAdmin,
  };
}
