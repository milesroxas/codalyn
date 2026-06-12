import { type TowerIndividualPlanKey, towerIndividualOwnedWorkspaceAllowance } from "@codalyn/webflow-kit";
import { and, count, eq, isNull, or } from "drizzle-orm";
import { resolveUserIndividualPlan } from "@/server/billing/stripe-individual-pro";
import { isTowerProductAdmin } from "@/server/membership/product-admin";
import { db } from "@/shared/lib/db";
import { member, organization, user } from "@/shared/lib/db/auth-schema";

/**
 * Free accounts may admin one workspace. Pro/Studio raise the owned-workspace allowance (see the shared
 * plan catalog); Team membership never grants extra owned workspaces. Operator overrides and product
 * admins bypass the allowance entirely.
 */
export const FREE_TIER_OWNED_WORKSPACE_LIMIT = towerIndividualOwnedWorkspaceAllowance("free");

export type UserWorkspaceCreationEligibility = {
  canCreate: boolean;
  /** Workspaces where the user is `admin` or `owner` (non-admin memberships are excluded). */
  ownedWorkspaceCount: number;
  /** The user's individual plan that determines their owned-workspace allowance. */
  individualPlan: TowerIndividualPlanKey;
  /** Owned/admin workspaces this user's individual plan permits. */
  ownedWorkspaceAllowance: number;
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

async function countUserOwnedWorkspaces(userId: string): Promise<number> {
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
    /** Operator override: allow additional owned workspaces beyond the plan allowance. */
    canCreateOrganizationOverride: boolean;
    /** Owned/admin workspaces permitted by the user's individual plan (Free=1, Pro/Studio higher). */
    ownedWorkspaceAllowance: number;
  }
): boolean {
  if (opts.isProductAdmin) {
    return true;
  }
  if (ownedWorkspaceCount < opts.ownedWorkspaceAllowance) {
    return true;
  }
  return opts.canCreateOrganizationOverride;
}

async function loadUserWorkspaceEligibilityRow(userId: string): Promise<UserWorkspaceEligibilityRow | null> {
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

export async function resolveUserWorkspaceCreationEligibilityFromRow(
  row: UserWorkspaceEligibilityRow,
  ownedWorkspaceCount: number
): Promise<UserWorkspaceCreationEligibility> {
  const individualPlan: TowerIndividualPlanKey = (await resolveUserIndividualPlan(row)) ?? "free";
  const hasIndividualPro = individualPlan !== "free";
  const ownedWorkspaceAllowance = towerIndividualOwnedWorkspaceAllowance(individualPlan);
  const canCreate = userMayCreateAnotherWorkspace(ownedWorkspaceCount, {
    isProductAdmin: isTowerProductAdmin(row),
    canCreateOrganizationOverride: row.canCreateOrganization,
    ownedWorkspaceAllowance,
  });

  return { canCreate, ownedWorkspaceCount, individualPlan, ownedWorkspaceAllowance, hasIndividualPro };
}

export async function resolveUserWorkspaceCreationEligibility(
  userId: string
): Promise<UserWorkspaceCreationEligibility> {
  const [row, ownedWorkspaceCount] = await Promise.all([
    loadUserWorkspaceEligibilityRow(userId),
    countUserOwnedWorkspaces(userId),
  ]);

  if (!row) {
    return {
      canCreate: false,
      ownedWorkspaceCount,
      individualPlan: "free",
      ownedWorkspaceAllowance: towerIndividualOwnedWorkspaceAllowance("free"),
      hasIndividualPro: false,
    };
  }

  return await resolveUserWorkspaceCreationEligibilityFromRow(row, ownedWorkspaceCount);
}
