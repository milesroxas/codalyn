import type Stripe from "stripe";
import { afterEach, describe, expect, it } from "vitest";
import {
  individualPlanForSubscription,
  individualPlanFromPriceIds,
  stripePriceIdForIndividualPlan,
} from "@/server/billing/stripe-individual-plan";

function setEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

describe("individualPlanFromPriceIds", () => {
  afterEach(() => {
    setEnv("STRIPE_PRICE_PRO", undefined);
    setEnv("STRIPE_PRICE_STUDIO", undefined);
  });

  it("returns studio when the studio price is present", () => {
    setEnv("STRIPE_PRICE_STUDIO", "price_studio");
    setEnv("STRIPE_PRICE_PRO", "price_pro");
    expect(individualPlanFromPriceIds(["price_studio"])).toBe("studio");
  });

  it("returns pro when only the pro price is present", () => {
    setEnv("STRIPE_PRICE_STUDIO", "price_studio");
    setEnv("STRIPE_PRICE_PRO", "price_pro");
    expect(individualPlanFromPriceIds(["price_pro"])).toBe("pro");
  });

  it("defaults to pro for unknown or legacy price ids", () => {
    setEnv("STRIPE_PRICE_STUDIO", "price_studio");
    expect(individualPlanFromPriceIds(["price_legacy"])).toBe("pro");
    expect(individualPlanFromPriceIds([null, undefined])).toBe("pro");
  });
});

describe("individualPlanForSubscription", () => {
  afterEach(() => {
    setEnv("STRIPE_PRICE_STUDIO", undefined);
  });

  function subscription(status: Stripe.Subscription.Status, priceId: string): Stripe.Subscription {
    return {
      status,
      items: { data: [{ price: { id: priceId } }] },
    } as unknown as Stripe.Subscription;
  }

  it("returns free for non-entitled status regardless of price", () => {
    setEnv("STRIPE_PRICE_STUDIO", "price_studio");
    expect(individualPlanForSubscription(subscription("canceled", "price_studio"))).toBe("free");
  });

  it("returns studio for an entitled studio subscription", () => {
    setEnv("STRIPE_PRICE_STUDIO", "price_studio");
    expect(individualPlanForSubscription(subscription("active", "price_studio"))).toBe("studio");
  });
});

describe("stripePriceIdForIndividualPlan", () => {
  afterEach(() => {
    setEnv("STRIPE_PRICE_PRO", undefined);
    setEnv("STRIPE_PRICE_STUDIO", undefined);
  });

  it("maps each plan to its configured price id", () => {
    setEnv("STRIPE_PRICE_PRO", "price_pro");
    setEnv("STRIPE_PRICE_STUDIO", "price_studio");
    expect(stripePriceIdForIndividualPlan("pro")).toBe("price_pro");
    expect(stripePriceIdForIndividualPlan("studio")).toBe("price_studio");
  });
});
