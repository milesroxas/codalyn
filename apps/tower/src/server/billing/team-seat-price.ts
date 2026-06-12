import { getStripe } from "@/server/billing/stripe-client";
import { getStripePriceTeamSeat } from "@/server/billing/stripe-config";
import type { TeamSeatPrice } from "@/shared/lib/billing/team-seat-price";

/** The per-seat team price changes rarely; cache the resolved value to avoid a Stripe call per render. */
const PRICE_CACHE_TTL_MS = 60 * 60 * 1000;
let cached: { value: TeamSeatPrice; at: number } | null = null;

/**
 * Resolves the team per-seat price (unit amount + currency + interval) from Stripe for the seat cost
 * preview. Returns null when billing is unconfigured, the price is not a simple recurring unit price
 * (e.g. tiered), or Stripe is unreachable — callers then render no preview rather than a wrong number.
 */
export async function getTeamSeatPrice(): Promise<TeamSeatPrice | null> {
  if (cached && Date.now() - cached.at < PRICE_CACHE_TTL_MS) {
    return cached.value;
  }

  const stripe = getStripe();
  const priceId = getStripePriceTeamSeat();
  if (!stripe || !priceId) {
    return null;
  }

  try {
    const price = await stripe.prices.retrieve(priceId);
    const interval = price.recurring?.interval;
    if (price.unit_amount == null || typeof price.currency !== "string" || !interval) {
      return null;
    }
    const value: TeamSeatPrice = { unitAmount: price.unit_amount, currency: price.currency, interval };
    cached = { value, at: Date.now() };
    return value;
  } catch {
    return null;
  }
}
