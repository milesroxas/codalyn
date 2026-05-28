import type { OperatorWorkspaceDetail, OperatorWorkspacePatch } from "@/server/operator/types";

export type OperatorWorkspaceBillingOverrideDraft = {
  seatLimitDraft: string;
  billingPlanDraft: string;
  subscriptionStatusDraft: string;
};

type SeatLimitOverrideParse =
  | { kind: "unchanged" }
  | { kind: "error"; error: string }
  | { kind: "value"; value: number | null };

function parseSeatLimitOverride(current: number | null, seatLimitDraft: string): SeatLimitOverrideParse {
  const raw = seatLimitDraft.trim();
  if (raw === "") {
    return current === null ? { kind: "unchanged" } : { kind: "value", value: null };
  }
  const parsed = Number(raw);
  if (parsed === current) {
    return { kind: "unchanged" };
  }
  if (!Number.isFinite(parsed) || parsed < 1) {
    return { kind: "error", error: "Seat limit must be a positive number or blank for the solo free cap." };
  }
  return { kind: "value", value: Math.floor(parsed) };
}

function parseNullableStringOverride(current: string | null, draft: string): string | null | undefined {
  const next = draft.trim() === "" ? null : draft.trim();
  return next === (current ?? null) ? undefined : next;
}

export function buildOperatorWorkspaceBillingOverridePatch(
  detail: Pick<
    OperatorWorkspaceDetail,
    "seatLimit" | "billingPlan" | "subscriptionStatus" | "canOperatorEditBilling" | "canOperatorEditSeatLimit"
  >,
  draft: OperatorWorkspaceBillingOverrideDraft
): OperatorWorkspacePatch | { error: string } | null {
  const update: OperatorWorkspacePatch = {};

  if (detail.canOperatorEditSeatLimit) {
    const seatLimit = parseSeatLimitOverride(detail.seatLimit, draft.seatLimitDraft);
    if (seatLimit.kind === "error") {
      return { error: seatLimit.error };
    }
    if (seatLimit.kind === "value") {
      update.seatLimit = seatLimit.value;
    }
  }

  if (detail.canOperatorEditBilling) {
    const billingPlan = parseNullableStringOverride(detail.billingPlan, draft.billingPlanDraft);
    if (billingPlan !== undefined) {
      update.billingPlan = billingPlan;
    }

    const subscriptionStatus = parseNullableStringOverride(detail.subscriptionStatus, draft.subscriptionStatusDraft);
    if (subscriptionStatus !== undefined) {
      update.subscriptionStatus = subscriptionStatus;
    }
  }

  return Object.keys(update).length > 0 ? update : null;
}
