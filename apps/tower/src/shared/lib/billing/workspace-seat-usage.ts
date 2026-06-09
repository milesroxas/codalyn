import {
  buildOrganizationSeatSnapshot,
  type OrganizationSeatCapOrg,
  type OrganizationSeatSnapshot,
} from "@/shared/lib/billing/organization-seat-cap";

/** Org fields required to compute seat usage for UI and enforcement (single source of truth). */
export type OrganizationSeatBillingRow = OrganizationSeatCapOrg & {
  stripeSeatQuantity?: number | null;
  operatorSeatLimitOverride?: boolean;
};

export type WorkspaceSeatUsage = OrganizationSeatSnapshot & {
  seatsUsed: number;
  seatLimit: number | null;
  stripeSeatQuantity: number | null;
  operatorSeatLimitOverride: boolean;
};

export function buildWorkspaceSeatUsage(seatsUsed: number, org: OrganizationSeatBillingRow): WorkspaceSeatUsage {
  const snapshot = buildOrganizationSeatSnapshot(seatsUsed, org);
  return {
    ...snapshot,
    seatsUsed,
    seatLimit: org.seatLimit ?? null,
    stripeSeatQuantity: org.stripeSeatQuantity ?? null,
    operatorSeatLimitOverride: org.operatorSeatLimitOverride ?? false,
  };
}

export function formatWorkspaceSeatUsageLabel(
  usage: Pick<WorkspaceSeatUsage, "seatsUsed" | "effectiveSeatLimit">
): string {
  const seatWord = usage.effectiveSeatLimit === 1 ? "seat" : "seats";
  return `${usage.seatsUsed} of ${usage.effectiveSeatLimit} ${seatWord} used`;
}

/**
 * Purchased Stripe seats not currently occupied — the admin is billed for these empty seats. Seat sync
 * is grow-only, so vacated seats keep billing until the admin reduces quantity in the Stripe Customer
 * Portal. Returns 0 for operator-granted caps (not Stripe-billed) and when no paid quantity is known.
 */
export function workspacePaidSeatsAvailable(
  usage: Pick<WorkspaceSeatUsage, "seatsUsed" | "stripeSeatQuantity" | "operatorSeatLimitOverride">
): number {
  if (usage.operatorSeatLimitOverride || usage.stripeSeatQuantity == null) {
    return 0;
  }
  return Math.max(0, usage.stripeSeatQuantity - usage.seatsUsed);
}

/** Copy nudging the admin to release empty paid seats, or null when none are unused. */
export function workspacePaidSeatsAvailableLabel(seatsAvailable: number): string | null {
  if (seatsAvailable <= 0) {
    return null;
  }
  const seatWord = seatsAvailable === 1 ? "seat" : "seats";
  return `${seatsAvailable} paid ${seatWord} available — reduce seats in the billing portal to stop paying for empty seats.`;
}

/** When billed Stripe quantity differs from the effective cap (operator grant or transitional sync). */
export function shouldShowWorkspaceSeatBillingBreakdown(
  usage: Pick<WorkspaceSeatUsage, "operatorSeatLimitOverride" | "stripeSeatQuantity" | "effectiveSeatLimit">
): boolean {
  const billed = usage.stripeSeatQuantity;
  if (billed == null) {
    return false;
  }
  return usage.operatorSeatLimitOverride || billed !== usage.effectiveSeatLimit;
}

export function workspaceSeatBillingBreakdownLines(
  usage: Pick<WorkspaceSeatUsage, "operatorSeatLimitOverride" | "stripeSeatQuantity" | "effectiveSeatLimit">
): { billedLabel: string; effectiveLabel: string } | null {
  if (!shouldShowWorkspaceSeatBillingBreakdown(usage)) {
    return null;
  }
  const billed = usage.stripeSeatQuantity;
  if (billed == null) {
    return null;
  }
  return {
    billedLabel: `${billed} billed on subscription`,
    effectiveLabel: usage.operatorSeatLimitOverride
      ? `${usage.effectiveSeatLimit} allowed (operator grant)`
      : `${usage.effectiveSeatLimit} allowed`,
  };
}
