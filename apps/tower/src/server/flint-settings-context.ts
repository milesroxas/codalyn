import type { FlintOrgTeamSettings } from "@codalyn/webflow-kit";
import { and, asc, eq, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { resolveActiveOrganizationId } from "@/server/resolve-active-organization-id";
import { db } from "@/shared/lib/db";
import { member, organization, user } from "@/shared/lib/db/auth-schema";
import { isProductAdminAppRole } from "@/shared/lib/membership/product-admin-role";
import { isTowerTeamAdminRole } from "@/shared/lib/membership/tower-organization-access";

export type FlintWorkspaceOption = { id: string; name: string };

/** Organizations the user is a member of (Tower team workspaces), sorted by name. */
export async function listFlintWorkspacesForUser(userId: string): Promise<FlintWorkspaceOption[]> {
  return db
    .select({ id: organization.id, name: organization.name })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, userId), isNull(organization.deletedAt)))
    .orderBy(asc(organization.name));
}

export type FlintMembershipContext = {
  userId: string;
  appUserRole: string | null;
  activeOrganizationId: string | null;
  memberRole: string | null;
  flintRestrictToEditorExperience: boolean;
  flintTeamSettings: FlintOrgTeamSettings | null;
};

function isEditorLikeWorkspaceRole(role: string | null | undefined): boolean {
  if (!role) {
    return false;
  }
  const normalizedRole = role.toLowerCase();
  return normalizedRole === "editor" || normalizedRole === "member";
}

export function computeFlintEditorExperience(ctx: FlintMembershipContext): boolean {
  if (isEditorLikeWorkspaceRole(ctx.memberRole)) {
    return true;
  }
  if (isTowerTeamAdminRole(ctx.memberRole) && ctx.flintRestrictToEditorExperience) {
    return true;
  }
  return false;
}

/** Org admins/owners and designers may edit team Flint config in Tower. */
export function canManageFlintTeamSettings(ctx: FlintMembershipContext): boolean {
  const memberRole = ctx.memberRole?.toLowerCase() ?? "";
  if (isTowerTeamAdminRole(memberRole)) {
    return true;
  }
  return memberRole === "designer";
}

/**
 * Resolves active org + membership for Flint APIs (session required).
 * When there is no active organization, team settings are unavailable.
 */
export async function resolveFlintMembershipContext(request: Request): Promise<FlintMembershipContext | null> {
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
      flintRestrictToEditorExperience: false,
      flintTeamSettings: null,
    };
  }

  const orgRows = await db
    .select({ flintTeamSettings: organization.flintTeamSettings })
    .from(organization)
    .where(eq(organization.id, activeOrganizationId))
    .limit(1);
  const flintTeamSettings = orgRows[0]?.flintTeamSettings ?? null;

  const memberRows = await db
    .select({
      role: member.role,
      flintRestrictToEditorExperience: member.flintRestrictToEditorExperience,
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
      flintRestrictToEditorExperience: false,
      flintTeamSettings,
    };
  }

  return {
    userId,
    appUserRole,
    activeOrganizationId,
    memberRole: m.role,
    flintRestrictToEditorExperience: m.flintRestrictToEditorExperience,
    flintTeamSettings,
  };
}

export async function resolveTargetOrganizationIdForFlintTeamSettings(
  ctx: FlintMembershipContext,
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
