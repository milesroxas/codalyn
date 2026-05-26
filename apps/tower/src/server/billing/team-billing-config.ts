/** Canonical `organization.billing_plan` value for self-serve Stripe team subscriptions. */
export const TEAM_BILLING_PLAN = "team" as const;

/** Solo workspace cap when `organization.seat_limit` is null (unpaid). Team billing raises the limit via Stripe. */
export const TEAM_UNPAID_SEAT_CAP = 1;

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

/** Per-seat recurring Stripe Price id for workspace (team) billing. */
export function getStripePriceTeamSeat(): string | null {
  const price = process.env.STRIPE_PRICE_TEAM_SEAT?.trim();
  return price && price.length > 0 ? price : null;
}

/** Minimum seats billed on team checkout (and floor when syncing subscription quantity). */
export function getTeamMinSeats(): number {
  return envInt("TOWER_TEAM_MIN_SEATS", 2);
}

export function isTeamBillingCheckoutConfigured(): boolean {
  return Boolean(getStripePriceTeamSeat());
}

export function resolveMembershipSeatCapFromOrg(org: { seatLimit?: number | null }): number {
  const raw = org.seatLimit;
  if (raw != null && typeof raw === "number" && !Number.isNaN(raw)) {
    return Math.max(1, raw);
  }
  return TEAM_UNPAID_SEAT_CAP;
}
