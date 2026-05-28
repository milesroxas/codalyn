import type Stripe from "stripe";

export function stripeCustomerIdFrom(c: Stripe.Customer | Stripe.DeletedCustomer | string): string {
  if (typeof c === "string") {
    return c;
  }
  if ("deleted" in c && c.deleted) {
    return c.id;
  }
  return c.id;
}
