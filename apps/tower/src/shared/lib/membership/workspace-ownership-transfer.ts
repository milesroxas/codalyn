import {
  WORKSPACE_OWNERSHIP_TRANSFER_STATUSES,
  type WorkspaceOwnershipTransferStatus,
} from "@/shared/lib/db/auth-schema";

export { WORKSPACE_OWNERSHIP_TRANSFER_STATUSES, type WorkspaceOwnershipTransferStatus };

export type WorkspaceOwnershipTransferErrorCode =
  | "not_found"
  | "forbidden"
  | "invalid_recipient"
  | "pending_exists"
  | "expired"
  | "billing_setup_required"
  | "billing_setup_failed"
  | "not_pending";

export function isPendingOwnershipTransferStatus(status: string): boolean {
  return status === "pending";
}

export function isTerminalOwnershipTransferStatus(status: WorkspaceOwnershipTransferStatus): boolean {
  return status !== "pending";
}

export function ownershipTransferRequiresBillingHandoff(input: {
  hasTeamSubscription: boolean;
  fromUserId: string;
  toUserId: string;
  billingOwnerUserId: string | null;
}): boolean {
  if (!input.hasTeamSubscription) {
    return false;
  }
  const billingOwnerId = input.billingOwnerUserId ?? input.fromUserId;
  return billingOwnerId !== input.toUserId;
}

export function canCommitOwnershipTransferAcceptance(input: {
  status: WorkspaceOwnershipTransferStatus;
  expiresAt: Date;
  now: Date;
  requiresBillingAcceptance: boolean;
  stripeBillingReady: boolean;
}): { ok: true } | { ok: false; code: WorkspaceOwnershipTransferErrorCode } {
  if (input.status !== "pending") {
    return { ok: false, code: "not_pending" };
  }
  if (input.expiresAt.getTime() <= input.now.getTime()) {
    return { ok: false, code: "expired" };
  }
  if (input.requiresBillingAcceptance && !input.stripeBillingReady) {
    return { ok: false, code: "billing_setup_required" };
  }
  return { ok: true };
}

export function parseWorkspaceOwnershipTransferStatus(raw: string): WorkspaceOwnershipTransferStatus | null {
  return (WORKSPACE_OWNERSHIP_TRANSFER_STATUSES as readonly string[]).includes(raw)
    ? (raw as WorkspaceOwnershipTransferStatus)
    : null;
}
