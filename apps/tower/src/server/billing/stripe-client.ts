import Stripe from "stripe";
import { assertStripeSecretKeyMatchesDeployEnvironment, readStripeSecretKey } from "@/server/billing/stripe-config";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = readStripeSecretKey();
  if (!key) {
    return null;
  }
  assertStripeSecretKeyMatchesDeployEnvironment(key);
  if (!_stripe) {
    _stripe = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return _stripe;
}
