import type { BeaconOrgTeamSettings } from "@codalyn/webflow-kit";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { resolveActiveOrganizationId } from "@/server/resolve-active-organization-id";
import { db } from "@/shared/lib/db";
import { member, organization, user } from "@/shared/lib/db/auth-schema";
import { isProductAdminAppRole } from "@/shared/lib/membership/product-admin-role";
import { isTowerTeamAdminRole } from "@/shared/lib/membership/tower-organization-access";

export type BeaconWorkspaceOption = { id: string; name: string };

/** Organizations the user is a member of (Tower team workspaces), sorted by name. */
export async function listBeaconWorkspacesForUser(userId: string): Promise<BeaconWorkspaceOption[]> {
  return db
    .select({ id: organization.id, name: organization.name })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(asc(organization.name));
}

export type BeaconMembershipContext = {
  userId: string;
  appUserRole: string | null;
  activeOrganizationId: string | null;
  memberRole: string | null;
  beaconRestrictToEditorExperience: boolean;
  beaconTeamSettings: BeaconOrgTeamSettings | null;
};

function isEditorLikeWorkspaceRole(role: string | null | undefined): boolean {
  if (!role) {
    return false;
  }
  return role === "editor" || role === "member";
}

export function computeBeaconEditorExperience(ctx: BeaconMembershipContext): boolean {
  if (isEditorLikeWorkspaceRole(ctx.memberRole)) {
    return true;
  }
  if (isTowerTeamAdminRole(ctx.memberRole) && ctx.beaconRestrictToEditorExperience) {
    return true;
  }
  return false;
}

/** Org admins, designers, and product admins may edit team Beacon presets in Tower. */
export function canManageBeaconTeamSettings(ctx: BeaconMembershipContext): boolean {
  if (isProductAdminAppRole(ctx.appUserRole)) {
    return true;
  }
  if (isTowerTeamAdminRole(ctx.memberRole)) {
    return true;
  }
  return ctx.memberRole === "designer";
}

/**
 * Resolves active org + membership for Beacon APIs (session required).
 * When there is no active organization, team settings are unavailable.
 */
export async function resolveBeaconMembershipContext(request: Request): Promise<BeaconMembershipContext | null> {
  const sessionData = await auth.api.getSession({ headers: request.headers });
  if (!sessionData?.user?.id) {
    return null;
  }
  const userId = sessionData.user.id;

  const userRows = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1);
  const appUserRole = userRows[0]?.role ?? null;

  const rawSession = sessionData.session as { id?: string } | undefined;
  const activeOrganizationId = await resolveActiveOrganizationId(userId, rawSession?.id);

  if (!activeOrganizationId) {
    return {
      userId,
      appUserRole,
      activeOrganizationId: null,
      memberRole: null,
      beaconRestrictToEditorExperience: false,
      beaconTeamSettings: null,
    };
  }

  const orgRows = await db
    .select({ beaconTeamSettings: organization.beaconTeamSettings })
    .from(organization)
    .where(eq(organization.id, activeOrganizationId))
    .limit(1);
  const beaconTeamSettings = orgRows[0]?.beaconTeamSettings ?? null;

  const memberRows = await db
    .select({
      role: member.role,
      beaconRestrictToEditorExperience: member.beaconRestrictToEditorExperience,
    })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, activeOrganizationId)))
    .limit(1);

  const m = memberRows[0];
  if (!m) {
    return {
      userId,
      appUserRole,
      activeOrganizationId,
      memberRole: null,
      beaconRestrictToEditorExperience: false,
      beaconTeamSettings,
    };
  }

  return {
    userId,
    appUserRole,
    activeOrganizationId,
    memberRole: m.role,
    beaconRestrictToEditorExperience: m.beaconRestrictToEditorExperience,
    beaconTeamSettings,
  };
}

export async function resolveTargetOrganizationIdForTeamSettings(
  ctx: BeaconMembershipContext,
  organizationIdFromBody: string | undefined
): Promise<string | null> {
  if (organizationIdFromBody?.trim()) {
    if (!isProductAdminAppRole(ctx.appUserRole)) {
      return null;
    }
    const id = organizationIdFromBody.trim();
    const rows = await db.select({ id: organization.id }).from(organization).where(eq(organization.id, id)).limit(1);
    return rows[0] ? id : null;
  }
  return ctx.activeOrganizationId;
}
