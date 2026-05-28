/** Org row fields governing operator-granted seats above Stripe-billed quantity. */
export type OrganizationSeatOverrideRow = {
  seatLimit: number | null;
  operatorSeatLimitOverride: boolean;
  stripeSeatQuantity: number | null;
};

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
