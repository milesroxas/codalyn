import { and, count, eq, isNull, or } from "drizzle-orm";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { userRowHasStripePro } from "@/server/billing/stripe-subscription-status";
import { isTowerProductAdmin } from "@/server/membership/product-admin";
import { db } from "@/shared/lib/db";
import { member, organization, user } from "@/shared/lib/db/auth-schema";

/** Free accounts may admin one workspace; additional owned workspaces require individual Pro (or ops override). */
export const FREE_TIER_OWNED_WORKSPACE_LIMIT = 1;

export type UserWorkspaceCreationEligibility = {
  canCreate: boolean;
  /** Workspaces where the user is `admin` or `owner` (non-admin memberships are excluded). */
  ownedWorkspaceCount: number;
  hasIndividualPro: boolean;
};

export type UserWorkspaceEligibilityRow = {
  id: string;
  role: string | null;
  canCreateOrganization: boolean;
  subscriptionPlan: string;
  subscriptionStatus: string | null;
  stripeSubscriptionId: string | null;
};

export async function countUserActiveWorkspaceMemberships(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, userId), isNull(organization.deletedAt)));

  return Number(row?.total ?? 0);
}

export async function countUserOwnedWorkspaces(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(
      and(
        eq(member.userId, userId),
        isNull(organization.deletedAt),
        or(eq(member.role, "admin"), eq(member.role, "owner"))
      )
    );

  return Number(row?.total ?? 0);
}

export function userMayCreateAnotherWorkspace(
  ownedWorkspaceCount: number,
  opts: {
    isProductAdmin: boolean;
    /** Operator override: allow additional owned workspaces without individual Pro. */
    canCreateOrganizationOverride: boolean;
    hasIndividualPro: boolean;
  }
): boolean {
  if (opts.isProductAdmin) {
    return true;
  }
  if (ownedWorkspaceCount < FREE_TIER_OWNED_WORKSPACE_LIMIT) {
    return true;
  }
  return opts.hasIndividualPro || opts.canCreateOrganizationOverride;
}

export async function loadUserWorkspaceEligibilityRow(userId: string): Promise<UserWorkspaceEligibilityRow | null> {
  const [row] = await db
    .select({
      id: user.id,
      role: user.role,
      canCreateOrganization: user.canCreateOrganization,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      stripeSubscriptionId: user.stripeSubscriptionId,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return row ?? null;
}

export function resolveUserWorkspaceCreationEligibilityFromRow(
  row: UserWorkspaceEligibilityRow,
  ownedWorkspaceCount: number
): UserWorkspaceCreationEligibility {
  const hasIndividualPro = isTowerBillingEnabled() && userRowHasStripePro(row);
  const canCreate = userMayCreateAnotherWorkspace(ownedWorkspaceCount, {
    isProductAdmin: isTowerProductAdmin(row),
    canCreateOrganizationOverride: row.canCreateOrganization,
    hasIndividualPro,
  });

  return { canCreate, ownedWorkspaceCount, hasIndividualPro };
}

export async function resolveUserWorkspaceCreationEligibility(
  userId: string
): Promise<UserWorkspaceCreationEligibility> {
  const [row, ownedWorkspaceCount] = await Promise.all([
    loadUserWorkspaceEligibilityRow(userId),
    countUserOwnedWorkspaces(userId),
  ]);

  if (!row) {
    return { canCreate: false, ownedWorkspaceCount, hasIndividualPro: false };
  }

  return resolveUserWorkspaceCreationEligibilityFromRow(row, ownedWorkspaceCount);
}
