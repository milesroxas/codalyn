import { countOrganizationSeatsUsed } from "@/server/billing/organization-seat-count";
import type { OperatorWorkspacePatch } from "@/server/operator/types";

export type OperatorWorkspaceSeatPatchInput = {
  seatLimit?: number | null;
  clearOperatorSeatOverride?: boolean;
};

export type OperatorWorkspaceSeatPatchPlan = {
  seatLimit?: number | null;
  operatorSeatLimitOverride?: boolean;
  clearOperatorSeatOverride?: boolean;
};

export async function planOperatorWorkspaceSeatPatch(
  organizationId: string,
  stripeSubscriptionId: string | null,
  input: OperatorWorkspaceSeatPatchInput
): Promise<{ plan: OperatorWorkspaceSeatPatchPlan } | { error: string }> {
  const plan: OperatorWorkspaceSeatPatchPlan = {};

  if (input.clearOperatorSeatOverride === true) {
    plan.operatorSeatLimitOverride = false;
    plan.clearOperatorSeatOverride = true;
    return { plan };
  }

  if (!("seatLimit" in input)) {
    return { plan };
  }

  const seatLimit = input.seatLimit ?? null;
  if (seatLimit !== null && (!Number.isFinite(seatLimit) || seatLimit < 1 || seatLimit > 100_000)) {
    return { error: "invalid_seatLimit" };
  }

  const seatsUsed = await countOrganizationSeatsUsed(organizationId);
  if (seatLimit !== null && seatLimit < seatsUsed) {
    return { error: "seat_limit_below_usage" };
  }

  plan.seatLimit = seatLimit;
  if (stripeSubscriptionId) {
    plan.operatorSeatLimitOverride = true;
  }

  return { plan };
}

export function mergeOperatorWorkspaceSeatPatch(
  parsed: OperatorWorkspacePatch,
  seatPlan: OperatorWorkspaceSeatPatchPlan
): OperatorWorkspacePatch {
  const merged: OperatorWorkspacePatch = { ...parsed };
  if ("seatLimit" in seatPlan) {
    merged.seatLimit = seatPlan.seatLimit;
  }
  if (seatPlan.operatorSeatLimitOverride !== undefined) {
    merged.operatorSeatLimitOverride = seatPlan.operatorSeatLimitOverride;
  }
  if (seatPlan.clearOperatorSeatOverride) {
    merged.clearOperatorSeatOverride = true;
  }
  return merged;
}
