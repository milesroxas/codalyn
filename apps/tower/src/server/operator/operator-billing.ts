import { towerPlanName } from "@codalyn/webflow-kit";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import {
  isOrganizationTeamEntitled,
  type OrganizationBillingRow,
  organizationBillingPlanLabel,
} from "@/server/billing/organization-billing";
import {
  type IndividualPaidPlan,
  userRowHasIndividualPaidPlan,
  userRowIndividualPlan,
} from "@/server/billing/stripe-subscription-status";
import type {
  OperatorUserBillingMode,
  OperatorWorkspaceBillingMode,
  OperatorWorkspacePatch,
} from "@/server/operator/types";

/** Stripe subscription id on a row means webhook-synced billing fields must not be operator-patched. */
export function isOperatorBillingManagedByStripe(stripeSubscriptionId: string | null | undefined): boolean {
  return Boolean(stripeSubscriptionId);
}

export type OperatorOrgBillingSnapshot = {
  billingMode: OperatorWorkspaceBillingMode;
  billingManagedByStripe: boolean;
  isProEntitled: boolean;
  displayBillingPlan: string | null;
  planLabel: string;
  canOperatorEditBilling: boolean;
  canOperatorEditSeatLimit: boolean;
};

function resolveOperatorWorkspaceBillingMode(row: OrganizationBillingRow): OperatorWorkspaceBillingMode {
  if (isOperatorBillingManagedByStripe(row.stripeSubscriptionId)) {
    return "stripe_team";
  }
  if (isOrganizationTeamEntitled(row)) {
    return "legacy_paid";
  }
  return "free";
}

function formatOperatorWorkspacePlanLabel(
  mode: OperatorWorkspaceBillingMode,
  displayBillingPlan: string | null
): string {
  if (mode === "free") {
    return "Free";
  }
  if (mode === "stripe_team") {
    return "Team";
  }
  return displayBillingPlan ?? "Paid";
}

export function buildOperatorOrgBillingSnapshot(row: OrganizationBillingRow): OperatorOrgBillingSnapshot {
  const billingMode = resolveOperatorWorkspaceBillingMode(row);
  const displayBillingPlan = organizationBillingPlanLabel(row);
  const billingManagedByStripe = isOperatorBillingManagedByStripe(row.stripeSubscriptionId);
  return {
    billingMode,
    billingManagedByStripe,
    isProEntitled: isOrganizationTeamEntitled(row),
    displayBillingPlan,
    planLabel: formatOperatorWorkspacePlanLabel(billingMode, displayBillingPlan),
    canOperatorEditBilling: !billingManagedByStripe,
    canOperatorEditSeatLimit: true,
  };
}

export type OperatorUserBillingRow = {
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  stripeSubscriptionId: string | null;
};

export type OperatorUserBillingSnapshot = {
  billingMode: OperatorUserBillingMode;
  billingManagedByStripe: boolean;
  isIndividualPaidEntitled: boolean;
  displayBillingPlan: string | null;
  planLabel: string;
};

function resolveOperatorUserBillingMode(row: OperatorUserBillingRow): OperatorUserBillingMode {
  if (isOperatorBillingManagedByStripe(row.stripeSubscriptionId)) {
    return "stripe_individual";
  }
  return "free";
}

function formatOperatorUserPlanLabel(
  mode: OperatorUserBillingMode,
  individualPlan: IndividualPaidPlan | null,
  subscriptionPlan: string | null
): string {
  if (mode === "free") {
    return "Free";
  }
  if (individualPlan) {
    return towerPlanName(individualPlan);
  }
  if (subscriptionPlan === "pro" || subscriptionPlan === "studio") {
    return towerPlanName(subscriptionPlan);
  }
  return "Free";
}

export function buildOperatorUserBillingSnapshot(row: OperatorUserBillingRow): OperatorUserBillingSnapshot {
  const billingMode = resolveOperatorUserBillingMode(row);
  const billingManagedByStripe = isOperatorBillingManagedByStripe(row.stripeSubscriptionId);
  const individualPlan = isTowerBillingEnabled() ? userRowIndividualPlan(row) : null;
  const isIndividualPaidEntitled = userRowHasIndividualPaidPlan(row) && isTowerBillingEnabled();
  const displayBillingPlan = individualPlan ?? (billingMode === "stripe_individual" ? row.subscriptionPlan : null);

  return {
    billingMode,
    billingManagedByStripe,
    isIndividualPaidEntitled,
    displayBillingPlan,
    planLabel: formatOperatorUserPlanLabel(billingMode, individualPlan, row.subscriptionPlan),
  };
}

export type OperatorStripeManagedPatchError = "billing_managed_by_stripe";

/** Returns a conflict code when patch touches Stripe-managed org billing metadata (not seat cap). */
export function resolveOperatorStripeManagedPatchConflict(
  stripeSubscriptionId: string | null | undefined,
  patch: OperatorWorkspacePatch
): OperatorStripeManagedPatchError | null {
  if (!isOperatorBillingManagedByStripe(stripeSubscriptionId)) {
    return null;
  }
  if ("billingPlan" in patch || "subscriptionStatus" in patch) {
    return "billing_managed_by_stripe";
  }
  return null;
}

export function mapOperatorOrgBillingFields(row: {
  billingPlan: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  operatorSeatLimitOverride: boolean;
  stripeSeatQuantity: number | null;
}) {
  const billingRow: OrganizationBillingRow = {
    billingPlan: row.billingPlan,
    subscriptionStatus: row.subscriptionStatus,
    stripeSubscriptionId: row.stripeSubscriptionId,
  };
  return {
    billingPlan: row.billingPlan,
    subscriptionStatus: row.subscriptionStatus,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    operatorSeatLimitOverride: row.operatorSeatLimitOverride,
    stripeSeatQuantity: row.stripeSeatQuantity,
    ...buildOperatorOrgBillingSnapshot(billingRow),
  };
}

export function mapOperatorUserBillingFields(row: {
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}) {
  const billingRow: OperatorUserBillingRow = {
    subscriptionPlan: row.subscriptionPlan,
    subscriptionStatus: row.subscriptionStatus,
    stripeSubscriptionId: row.stripeSubscriptionId,
  };
  return {
    subscriptionPlan: row.subscriptionPlan,
    subscriptionStatus: row.subscriptionStatus,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    ...buildOperatorUserBillingSnapshot(billingRow),
  };
}
