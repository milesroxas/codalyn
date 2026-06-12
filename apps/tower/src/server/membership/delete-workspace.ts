import { and, eq, inArray } from "drizzle-orm";
import Stripe from "stripe";
import { getStripe } from "@/server/billing/stripe-client";
import {
  sendWorkspaceDeletedMemberNotificationEmail,
  sendWorkspaceDeletionPreNoticeEmail,
} from "@/server/email/workspace-deletion-member-email";
import { computePurgeScheduledAt } from "@/server/membership/workspace-deletion-preview";
import { assertUserIsWorkspaceOwner } from "@/server/membership/workspace-ownership";
import { ActorPasswordVerificationError, assertActorPassword } from "@/server/security/verify-actor-password";
import { db } from "@/shared/lib/db";
import { member, organization, session as sessionTable, user } from "@/shared/lib/db/auth-schema";
import {
  assertWorkspaceSlugConfirmation,
  operatorWorkspacePurgePhraseMatches,
  type WorkspaceDeletionErrorCode,
} from "@/shared/lib/membership/workspace-deletion";
import { WORKSPACE_SOFT_DELETE_RECOVERY_DAYS } from "@/shared/lib/membership/workspace-ownership";

const WORKSPACE_RECORD_DELETE_ATTEMPTS = 3;

export type DeleteWorkspaceInput = {
  organizationId: string;
  /** Required for destructive actions; compared case-insensitively to the workspace slug. */
  confirmSlug: string;
  /** Required re-authentication for user-initiated workspace deletion. */
  password?: string;
  /**
   * When set, re-checks workspace ownership immediately before delete (closes TOCTOU between route auth and delete).
   */
  actorUserId?: string;
  /** Product-admin operator deletes bypass password and ownership checks. */
  operatorInitiated?: boolean;
  /** When purging a soft-deleted workspace, must be `PURGE` (validated server-side). */
  operatorPurgePhrase?: string;
  /** Notify members after deletion is scheduled. Defaults to true. */
  notifyMembers?: boolean;
  /** Optional pre-deletion notice for paid workspaces. Defaults to true when Team billing is active. */
  notifyPaidPreDeletion?: boolean;
};

type WorkspaceDeletionTarget = {
  id: string;
  slug: string;
  name: string;
  stripeSubscriptionId: string | null;
  deletedAt: Date | null;
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

/** Product-admin routes: read workspace row for delete/purge confirmation (includes soft-deleted). */
export async function loadWorkspaceDeletionTargetForOperator(
  organizationId: string
): Promise<WorkspaceDeletionTarget | null> {
  return loadWorkspaceDeletionTarget(organizationId);
}

async function loadWorkspaceDeletionTarget(organizationId: string): Promise<WorkspaceDeletionTarget | null> {
  const [target] = await db
    .select({
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      stripeSubscriptionId: organization.stripeSubscriptionId,
      deletedAt: organization.deletedAt,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  return target ?? null;
}

async function notifyWorkspaceMembersOfDeletion(input: {
  organizationId: string;
  workspaceName: string;
  actorUserId: string;
  recoveryDays: number;
  notifyPaidPreDeletion: boolean;
  hasTeamSubscription: boolean;
}): Promise<void> {
  const [actor] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, input.actorUserId))
    .limit(1);

  const members = await db
    .select({ email: user.email, userId: member.userId })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, input.organizationId));

  const actorName = actor?.name ?? actor?.email ?? null;

  await Promise.all(
    members
      .filter((row) => row.userId !== input.actorUserId)
      .map(async (row) => {
        if (input.notifyPaidPreDeletion && input.hasTeamSubscription) {
          await sendWorkspaceDeletionPreNoticeEmail({
            to: row.email,
            workspaceName: input.workspaceName,
            actorName,
          });
        }
        await sendWorkspaceDeletedMemberNotificationEmail({
          to: row.email,
          workspaceName: input.workspaceName,
          actorName,
          recoveryDays: input.recoveryDays,
        });
      })
  );
}

async function softDeleteWorkspaceTarget(
  target: WorkspaceDeletionTarget,
  actorUserId: string,
  input: DeleteWorkspaceInput
): Promise<void> {
  if (target.deletedAt) {
    throw new WorkspaceDeletionError("not_found");
  }

  await cancelWorkspaceStripeSubscription(target.stripeSubscriptionId);

  const deletedAt = new Date();
  const purgeScheduledAt = computePurgeScheduledAt(deletedAt);

  await db.transaction(async (tx) => {
    await tx
      .update(sessionTable)
      .set({ activeOrganizationId: null })
      .where(eq(sessionTable.activeOrganizationId, target.id));

    await tx
      .update(organization)
      .set({
        deletedAt,
        purgeScheduledAt,
        billingOwnerUserId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: "canceled",
        billingPlan: null,
        seatLimit: null,
        stripeSeatQuantity: null,
      })
      .where(and(eq(organization.id, target.id), eq(organization.ownerUserId, actorUserId)));
  });

  if (input.notifyMembers !== false) {
    const hasTeamSubscription = Boolean(target.stripeSubscriptionId);
    void notifyWorkspaceMembersOfDeletion({
      organizationId: target.id,
      workspaceName: target.name,
      actorUserId,
      recoveryDays: WORKSPACE_SOFT_DELETE_RECOVERY_DAYS,
      notifyPaidPreDeletion: input.notifyPaidPreDeletion !== false,
      hasTeamSubscription,
    }).catch(() => undefined);
  }
}

/** Product-admin: hard-delete active workspaces or permanently purge soft-deleted ones. */
async function deleteWorkspaceAsOperator(
  organizationId: string,
  confirmSlug: string,
  operatorPurgePhrase?: string
): Promise<void> {
  const target = await loadWorkspaceDeletionTarget(organizationId);
  if (!target) {
    throw new WorkspaceDeletionError("not_found");
  }
  const confirmResult = assertWorkspaceSlugConfirmation(confirmSlug, target.slug);
  if (!confirmResult.ok) {
    throw new WorkspaceDeletionError(confirmResult.code);
  }
  if (target.deletedAt) {
    if (!operatorWorkspacePurgePhraseMatches(operatorPurgePhrase ?? "")) {
      throw new WorkspaceDeletionError("confirm_phrase_mismatch");
    }
    await removeWorkspaceRecordsWithRetry([target.id]);
    return;
  }
  await cancelWorkspaceStripeSubscription(target.stripeSubscriptionId);
  await removeWorkspaceRecordsWithRetry([target.id]);
}

/**
 * Soft-deletes a workspace after slug confirmation and password re-authentication.
 * Members lose access immediately; rows are permanently purged after the recovery window.
 */
export async function deleteWorkspace(input: DeleteWorkspaceInput): Promise<void> {
  const organizationId = input.organizationId.trim();
  if (!organizationId) {
    throw new WorkspaceDeletionError("not_found");
  }

  if (input.operatorInitiated) {
    await deleteWorkspaceAsOperator(organizationId, input.confirmSlug, input.operatorPurgePhrase);
    return;
  }

  if (!input.actorUserId) {
    throw new WorkspaceDeletionError("forbidden");
  }

  await assertUserIsWorkspaceOwner(input.actorUserId, organizationId);

  try {
    await assertActorPassword(input.actorUserId, input.password ?? "");
  } catch (error) {
    if (error instanceof ActorPasswordVerificationError) {
      throw new WorkspaceDeletionError("forbidden", error.message);
    }
    throw error;
  }

  const target = await loadWorkspaceDeletionTarget(organizationId);
  if (!target || target.deletedAt) {
    throw new WorkspaceDeletionError("not_found");
  }

  const confirmResult = assertWorkspaceSlugConfirmation(input.confirmSlug, target.slug);
  if (!confirmResult.ok) {
    throw new WorkspaceDeletionError(confirmResult.code);
  }

  await softDeleteWorkspaceTarget(target, input.actorUserId, input);
}
