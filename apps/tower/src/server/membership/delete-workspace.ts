import { eq, inArray } from "drizzle-orm";
import Stripe from "stripe";
import { getStripe } from "@/server/billing/stripe-client";
import { isTowerTeamAdminMemberOfOrg } from "@/server/tower-webflow-oauth-team-admin";
import { db } from "@/shared/lib/db";
import { organization, session as sessionTable } from "@/shared/lib/db/auth-schema";
import {
  assertWorkspaceSlugConfirmation,
  type WorkspaceDeletionErrorCode,
} from "@/shared/lib/membership/workspace-deletion";

const WORKSPACE_RECORD_DELETE_ATTEMPTS = 3;

export type DeleteWorkspaceInput = {
  organizationId: string;
  /** Required for destructive actions; compared case-insensitively to the workspace slug. */
  confirmSlug: string;
  /**
   * When set, re-checks team admin membership immediately before delete (closes TOCTOU between route auth and delete).
   */
  actorUserId?: string;
};

type WorkspaceDeletionTarget = {
  id: string;
  slug: string;
  stripeSubscriptionId: string | null;
};

export class WorkspaceDeletionError extends Error {
  readonly code: WorkspaceDeletionErrorCode;

  constructor(code: WorkspaceDeletionErrorCode, message?: string) {
    super(message ?? code);
    this.name = "WorkspaceDeletionError";
    this.code = code;
  }
}

function isStripeSubscriptionCancelIgnorable(error: unknown): boolean {
  if (!(error instanceof Stripe.errors.StripeInvalidRequestError)) {
    return false;
  }
  return error.code === "resource_missing";
}

async function cancelWorkspaceStripeSubscription(stripeSubscriptionId: string | null): Promise<void> {
  if (!stripeSubscriptionId) {
    return;
  }
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Workspace has a Stripe subscription but Stripe is not configured.");
  }
  try {
    await stripe.subscriptions.cancel(stripeSubscriptionId);
  } catch (error) {
    if (isStripeSubscriptionCancelIgnorable(error)) {
      return;
    }
    throw error;
  }
}

async function removeWorkspaceRecords(organizationIds: string[]): Promise<void> {
  if (organizationIds.length === 0) {
    return;
  }
  await db.transaction(async (tx) => {
    await tx
      .update(sessionTable)
      .set({ activeOrganizationId: null })
      .where(inArray(sessionTable.activeOrganizationId, organizationIds));
    await tx.delete(organization).where(inArray(organization.id, organizationIds));
  });
}

async function removeWorkspaceRecordsWithRetry(organizationIds: string[]): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < WORKSPACE_RECORD_DELETE_ATTEMPTS; attempt += 1) {
    try {
      await removeWorkspaceRecords(organizationIds);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function loadWorkspaceDeletionTarget(organizationId: string): Promise<WorkspaceDeletionTarget | null> {
  const [target] = await db
    .select({
      id: organization.id,
      slug: organization.slug,
      stripeSubscriptionId: organization.stripeSubscriptionId,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  return target ?? null;
}

async function loadWorkspaceDeletionTargets(organizationIds: string[]): Promise<WorkspaceDeletionTarget[]> {
  if (organizationIds.length === 0) {
    return [];
  }
  return db
    .select({
      id: organization.id,
      slug: organization.slug,
      stripeSubscriptionId: organization.stripeSubscriptionId,
    })
    .from(organization)
    .where(inArray(organization.id, organizationIds));
}

async function assertActorMayDeleteWorkspace(actorUserId: string, organizationId: string): Promise<void> {
  const allowed = await isTowerTeamAdminMemberOfOrg(actorUserId, organizationId);
  if (!allowed) {
    throw new WorkspaceDeletionError("forbidden");
  }
}

async function deleteWorkspaceTargets(targets: WorkspaceDeletionTarget[]): Promise<void> {
  if (targets.length === 0) {
    return;
  }
  for (const target of targets) {
    await cancelWorkspaceStripeSubscription(target.stripeSubscriptionId);
  }
  try {
    await removeWorkspaceRecordsWithRetry(targets.map((target) => target.id));
  } catch {
    throw new WorkspaceDeletionError(
      "deletion_incomplete",
      "Billing was canceled but workspace deletion did not finish. Retry the delete operation."
    );
  }
}

/**
 * Single source of truth for deleting a workspace (`organization` row).
 * Members lose access; user accounts remain. FK cascades remove memberships, invitations,
 * and Webflow OAuth tokens. `user.preferred_organization_id` is cleared via ON DELETE SET NULL.
 */
export async function deleteWorkspace(input: DeleteWorkspaceInput): Promise<void> {
  const organizationId = input.organizationId.trim();
  if (!organizationId) {
    throw new WorkspaceDeletionError("not_found");
  }

  if (input.actorUserId) {
    await assertActorMayDeleteWorkspace(input.actorUserId, organizationId);
  }

  const target = await loadWorkspaceDeletionTarget(organizationId);
  if (!target) {
    throw new WorkspaceDeletionError("not_found");
  }

  const confirmResult = assertWorkspaceSlugConfirmation(input.confirmSlug, target.slug);
  if (!confirmResult.ok) {
    throw new WorkspaceDeletionError(confirmResult.code);
  }

  await deleteWorkspaceTargets([target]);
}

/**
 * Account deletion cleanup for sole-member workspaces (system-initiated; slug loaded server-side).
 * Cancels Stripe for all targets first, then removes rows in one DB transaction.
 */
export async function deleteWorkspacesForAccountCleanup(organizationIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(organizationIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return;
  }

  const targets = await loadWorkspaceDeletionTargets(uniqueIds);
  if (targets.length !== uniqueIds.length) {
    throw new WorkspaceDeletionError("not_found");
  }

  await deleteWorkspaceTargets(targets);
}
