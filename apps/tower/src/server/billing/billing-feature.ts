/**
 * Gates Stripe Checkout, webhooks, Customer Portal, and `/billing` UI.
 * **Default: off** (unset or any value other than `1`, `true`, `yes`).
 * Org/operator billing on `organization` is unchanged; only per-user Stripe Pro is behind this.
 */
export function isTowerBillingEnabled(): boolean {
  const v = process.env.TOWER_BILLING_ENABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
