import {
  getDefaultBeaconAppSettings,
  listBeaconPresetStorageEntries,
  mergeOrgTeamSettingsIntoUser,
  parseBeaconAppSettings,
} from "@codalyn/webflow-kit";
import { and, count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import { getTowerSessionOnboardingContext } from "@/server/tower-onboarding-context";
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

async function loadTowerDashboardSummary(includeWebflowSites: boolean): Promise<TowerDashboardSummary> {
  const ctx = await getTowerSessionOnboardingContext();

  if (!ctx.signedIn || !ctx.userId) {
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

  const { userId, userEmail, activeOrganizationId } = ctx;

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

  const requestHeaders = await headers();
  const webflowSites =
    includeWebflowSites && ctx.webflowAccessToken
      ? await listWebflowSitesForUser({
          userId,
          requestHeaders,
          accessToken: ctx.webflowAccessToken,
        })
      : null;

  return {
    signedIn: true,
    userEmail,
    activeOrganizationId,
    activeOrganizationName,
    workspaceMembershipCount: ctx.workspaceMembershipCount,
    canCreateOrganization: ctx.canCreateOrganization,
    workspaceMemberCount,
    workspacePendingInviteCount,
    beaconPresetCount,
    webflowOAuthConnected: ctx.webflowOAuthConnected,
    webflowSites,
    activeOrgTeamAdmin: ctx.activeOrgTeamAdmin,
  };
}

const getTowerDashboardSummaryCached = cache(loadTowerDashboardSummary);

export async function getTowerDashboardSummary(
  options: GetTowerDashboardSummaryOptions = {}
): Promise<TowerDashboardSummary> {
  return getTowerDashboardSummaryCached(options.includeWebflowSites ?? false);
}
