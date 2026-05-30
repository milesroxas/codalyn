import { getTeamMinSeats } from "@/server/billing/team-billing-config";

/** Org row fields governing operator-granted seats above Stripe-billed quantity. */
export type OrganizationSeatOverrideRow = {
  seatLimit: number | null;
  operatorSeatLimitOverride: boolean;
  stripeSeatQuantity: number | null;
};

/** Stripe-managed team subs below product minimum should be bumped via seat sync (not operator override). */
export function shouldBumpStripeTeamQuantityToMinimum(
  entitled: boolean,
  row: Pick<OrganizationSeatOverrideRow, "operatorSeatLimitOverride">,
  stripeSeatQuantity: number | null
): boolean {
  if (!entitled || row.operatorSeatLimitOverride || stripeSeatQuantity == null) {
    return false;
  }
  return stripeSeatQuantity < getTeamMinSeats();
}

/** When true, Stripe quantity sync must not change seat cap or subscription billing. */
export function shouldSkipStripeSeatQuantitySync(
  row: Pick<OrganizationSeatOverrideRow, "operatorSeatLimitOverride">
): boolean {
  return row.operatorSeatLimitOverride;
}

/** Webhook/sync writes paid quantity; preserves operator-raised seat cap when override is active. */
export function resolveOrganizationSeatLimitAfterStripeQuantity(
  row: OrganizationSeatOverrideRow,
  stripeSeatQuantity: number | null,
  entitled: boolean
): number | null {
  if (!entitled) {
    return null;
  }
  if (row.operatorSeatLimitOverride) {
    return row.seatLimit;
  }
  return stripeSeatQuantity;
}
