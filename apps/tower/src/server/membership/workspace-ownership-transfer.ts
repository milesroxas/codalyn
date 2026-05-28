import { and, eq, inArray, lte } from "drizzle-orm";
import { isOrganizationProEntitled } from "@/server/billing/organization-billing";
import { syncOrganizationSeatQuantityWithStripe } from "@/server/billing/stripe-org-seat-sync";
import { sendWorkspaceOwnershipTransferEmail } from "@/server/email/workspace-ownership-transfer-email";
import {
  assertUserIsWorkspaceMember,
  assertUserIsWorkspaceOwner,
  loadActiveWorkspaceOwnerRow,
} from "@/server/membership/workspace-ownership";
import {
  commitAcceptedOwnershipTransfer,
  readOrganizationBillingEntitlement,
  syncBillingOwnerStripeCustomer,
} from "@/server/membership/workspace-ownership-transfer-commit";
import { db } from "@/shared/lib/db";
import { organization, user, workspaceOwnershipTransfer } from "@/shared/lib/db/auth-schema";
import { WORKSPACE_OWNERSHIP_TRANSFER_EXPIRY_DAYS } from "@/shared/lib/membership/workspace-ownership";
import {
  canCommitOwnershipTransferAcceptance,
  isPendingOwnershipTransferStatus,
  ownershipTransferRequiresBillingHandoff,
  type WorkspaceOwnershipTransferErrorCode,
} from "@/shared/lib/membership/workspace-ownership-transfer";

export class WorkspaceOwnershipTransferError extends Error {
  readonly code: WorkspaceOwnershipTransferErrorCode;

  constructor(code: WorkspaceOwnershipTransferErrorCode, message?: string) {
    super(message ?? code);
    this.name = "WorkspaceOwnershipTransferError";
    this.code = code;
  }
}

function transferExpiryDate(now = new Date()): Date {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + WORKSPACE_OWNERSHIP_TRANSFER_EXPIRY_DAYS);
  return expiresAt;
}

async function expireStalePendingTransfers(organizationId: string, now = new Date()): Promise<void> {
  await db
    .update(workspaceOwnershipTransfer)
    .set({ status: "expired" })
    .where(
      and(
        eq(workspaceOwnershipTransfer.organizationId, organizationId),
        eq(workspaceOwnershipTransfer.status, "pending"),
        lte(workspaceOwnershipTransfer.expiresAt, now)
      )
    );
}

async function loadPendingTransfer(organizationId: string) {
  const [row] = await db
    .select()
    .from(workspaceOwnershipTransfer)
    .where(
      and(
        eq(workspaceOwnershipTransfer.organizationId, organizationId),
        eq(workspaceOwnershipTransfer.status, "pending")
      )
    )
    .limit(1);
  return row ?? null;
}

async function resolveTransferAcceptanceContext(input: { transferId: string; recipientUserId: string }) {
  const [transfer] = await db
    .select()
    .from(workspaceOwnershipTransfer)
    .where(eq(workspaceOwnershipTransfer.id, input.transferId))
    .limit(1);
  if (!transfer) {
    throw new WorkspaceOwnershipTransferError("not_found");
  }
  if (transfer.toUserId !== input.recipientUserId) {
    throw new WorkspaceOwnershipTransferError("forbidden");
  }

  const now = new Date();
  if (transfer.expiresAt.getTime() <= now.getTime() && transfer.status === "pending") {
    await db
      .update(workspaceOwnershipTransfer)
      .set({ status: "expired" })
      .where(eq(workspaceOwnershipTransfer.id, transfer.id));
    throw new WorkspaceOwnershipTransferError("expired");
  }

  const commitCheck = canCommitOwnershipTransferAcceptance({
    status: transfer.status,
    expiresAt: transfer.expiresAt,
    now,
    requiresBillingAcceptance: transfer.requiresBillingAcceptance,
    stripeBillingReady: transfer.stripeBillingReady,
  });
  if (!commitCheck.ok) {
    throw new WorkspaceOwnershipTransferError(commitCheck.code);
  }

  const orgRow = await loadActiveWorkspaceOwnerRow(transfer.organizationId);
  if (!orgRow || orgRow.ownerUserId !== transfer.fromUserId) {
    throw new WorkspaceOwnershipTransferError("not_found", "Workspace ownership changed before accept.");
  }

  const [billingRow] = await db
    .select({
      subscriptionStatus: organization.subscriptionStatus,
      billingPlan: organization.billingPlan,
      stripeSubscriptionId: organization.stripeSubscriptionId,
      stripeCustomerId: organization.stripeCustomerId,
      name: organization.name,
    })
    .from(organization)
    .where(eq(organization.id, transfer.organizationId))
    .limit(1);

  return { transfer, orgRow, billingRow };
}

export function createWorkspaceOwnershipTransferService() {
  return {
    async createTransfer(input: { organizationId: string; fromUserId: string; toUserId: string }) {
      const orgRow = await assertUserIsWorkspaceOwner(input.fromUserId, input.organizationId);
      if (input.fromUserId === input.toUserId) {
        throw new WorkspaceOwnershipTransferError("invalid_recipient");
      }

      await assertUserIsWorkspaceMember(input.toUserId, input.organizationId);

      await expireStalePendingTransfers(input.organizationId);

      const existingPending = await loadPendingTransfer(input.organizationId);
      if (existingPending) {
        throw new WorkspaceOwnershipTransferError("pending_exists");
      }

      const [billingRow] = await db
        .select({
          subscriptionStatus: organization.subscriptionStatus,
          billingPlan: organization.billingPlan,
          stripeSubscriptionId: organization.stripeSubscriptionId,
        })
        .from(organization)
        .where(eq(organization.id, input.organizationId))
        .limit(1);

      const hasTeamSubscription = billingRow
        ? isOrganizationProEntitled({
            subscriptionStatus: billingRow.subscriptionStatus,
            billingPlan: billingRow.billingPlan,
            stripeSubscriptionId: billingRow.stripeSubscriptionId,
          })
        : false;

      const requiresBillingAcceptance = ownershipTransferRequiresBillingHandoff({
        hasTeamSubscription,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        billingOwnerUserId: orgRow.billingOwnerUserId,
      });

      const id = crypto.randomUUID();
      const now = new Date();
      await db.insert(workspaceOwnershipTransfer).values({
        id,
        organizationId: input.organizationId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        status: "pending",
        expiresAt: transferExpiryDate(now),
        requiresBillingAcceptance,
        stripeBillingReady: !requiresBillingAcceptance,
        createdAt: now,
        updatedAt: now,
      });

      const [recipientUser, orgNameRow] = await Promise.all([
        db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, input.toUserId)).limit(1),
        db
          .select({ name: organization.name })
          .from(organization)
          .where(eq(organization.id, input.organizationId))
          .limit(1),
      ]);
      const [fromUser] = await db.select({ name: user.name }).from(user).where(eq(user.id, input.fromUserId)).limit(1);

      if (recipientUser[0]?.email) {
        void sendWorkspaceOwnershipTransferEmail({
          to: recipientUser[0].email,
          workspaceName: orgNameRow[0]?.name ?? "Workspace",
          fromUserName: fromUser?.name ?? null,
          transferId: id,
          requiresBillingAcceptance,
        }).catch(() => undefined);
      }

      return { transferId: id, requiresBillingAcceptance };
    },

    async acceptTransfer(input: { transferId: string; recipientUserId: string }) {
      const { transfer, orgRow, billingRow } = await resolveTransferAcceptanceContext(input);
      const hasTeamSubscription = readOrganizationBillingEntitlement(billingRow);

      try {
        await commitAcceptedOwnershipTransfer({ transfer, orgRow, billingRow, hasTeamSubscription });
      } catch (error) {
        if (error instanceof Error && error.message === "not_pending") {
          throw new WorkspaceOwnershipTransferError("not_pending");
        }
        throw error;
      }

      await syncBillingOwnerStripeCustomer(transfer, billingRow, hasTeamSubscription);
      await syncOrganizationSeatQuantityWithStripe(transfer.organizationId);
      return { organizationId: transfer.organizationId };
    },

    async declineTransfer(input: { transferId: string; recipientUserId: string }) {
      const [transfer] = await db
        .select()
        .from(workspaceOwnershipTransfer)
        .where(eq(workspaceOwnershipTransfer.id, input.transferId))
        .limit(1);
      if (!transfer) {
        throw new WorkspaceOwnershipTransferError("not_found");
      }
      if (transfer.toUserId !== input.recipientUserId) {
        throw new WorkspaceOwnershipTransferError("forbidden");
      }
      if (!isPendingOwnershipTransferStatus(transfer.status)) {
        throw new WorkspaceOwnershipTransferError("not_pending");
      }
      await db
        .update(workspaceOwnershipTransfer)
        .set({ status: "declined" })
        .where(eq(workspaceOwnershipTransfer.id, transfer.id));
    },

    async cancelTransfer(input: { transferId: string; ownerUserId: string }) {
      const [transfer] = await db
        .select()
        .from(workspaceOwnershipTransfer)
        .where(eq(workspaceOwnershipTransfer.id, input.transferId))
        .limit(1);
      if (!transfer) {
        throw new WorkspaceOwnershipTransferError("not_found");
      }
      if (transfer.fromUserId !== input.ownerUserId) {
        throw new WorkspaceOwnershipTransferError("forbidden");
      }
      if (!isPendingOwnershipTransferStatus(transfer.status)) {
        throw new WorkspaceOwnershipTransferError("not_pending");
      }
      await db
        .update(workspaceOwnershipTransfer)
        .set({ status: "canceled" })
        .where(eq(workspaceOwnershipTransfer.id, transfer.id));
    },

    async markBillingReadyForTransfer(transferId: string): Promise<void> {
      await db
        .update(workspaceOwnershipTransfer)
        .set({ stripeBillingReady: true })
        .where(
          and(
            eq(workspaceOwnershipTransfer.id, transferId),
            eq(workspaceOwnershipTransfer.status, "pending"),
            eq(workspaceOwnershipTransfer.requiresBillingAcceptance, true)
          )
        );
    },

    async listPendingForUser(userId: string) {
      const rows = await db
        .select({
          id: workspaceOwnershipTransfer.id,
          organizationId: workspaceOwnershipTransfer.organizationId,
          fromUserId: workspaceOwnershipTransfer.fromUserId,
          toUserId: workspaceOwnershipTransfer.toUserId,
          status: workspaceOwnershipTransfer.status,
          expiresAt: workspaceOwnershipTransfer.expiresAt,
          requiresBillingAcceptance: workspaceOwnershipTransfer.requiresBillingAcceptance,
          stripeBillingReady: workspaceOwnershipTransfer.stripeBillingReady,
          organizationName: organization.name,
          organizationSlug: organization.slug,
        })
        .from(workspaceOwnershipTransfer)
        .innerJoin(organization, eq(workspaceOwnershipTransfer.organizationId, organization.id))
        .where(
          and(eq(workspaceOwnershipTransfer.status, "pending"), inArray(workspaceOwnershipTransfer.toUserId, [userId]))
        );
      return rows;
    },

    async getPendingForOrganization(organizationId: string, actorUserId: string) {
      await assertUserIsWorkspaceOwner(actorUserId, organizationId);
      return loadPendingTransfer(organizationId);
    },

    expireStalePendingTransfers,
  };
}

export const workspaceOwnershipTransferService = createWorkspaceOwnershipTransferService();
