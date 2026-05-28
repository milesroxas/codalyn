/** Canonical `organization.billing_plan` value for self-serve Stripe team subscriptions. */
export const TEAM_BILLING_PLAN = "team" as const;

export {
  resolveMembershipSeatCapFromOrg,
  TEAM_UNPAID_SEAT_CAP,
} from "@/shared/lib/billing/organization-seat-cap";

const envInt = (name: string, fallback: number): number => {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return fallback;
  }
  return n;
};

export {
  getStripePriceTeamSeat,
  isTeamBillingCheckoutConfigured,
} from "@/server/billing/stripe-config";

/** Minimum seats billed on team checkout (and floor when syncing subscription quantity). */
export function getTeamMinSeats(): number {
  return envInt("TOWER_TEAM_MIN_SEATS", 2);
}
