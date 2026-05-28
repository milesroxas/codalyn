import { afterEach, describe, expect, it } from "vitest";

import {
  assertStripeSecretKeyMatchesDeployEnvironment,
  getStripePricePro,
  stripeKeyMode,
} from "@/server/billing/stripe-config";

describe("stripe-config", () => {
  const envKeys = [
    "VERCEL_ENV",
    "STRIPE_SECRET_KEY",
    "STRIPE_PRICE_PRO",
    "TOWER_STRIPE_REQUIRE_LIVE_IN_PRODUCTION",
  ] as const;
  const prev: Partial<Record<(typeof envKeys)[number], string | undefined>> = {};

  afterEach(() => {
    for (const key of envKeys) {
      if (prev[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prev[key];
      }
    }
  });

  function stubEnv(key: (typeof envKeys)[number], value: string | undefined) {
    if (!(key in prev)) {
      prev[key] = process.env[key];
    }
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  it("stripeKeyMode recognizes test and live prefixes", () => {
    expect(stripeKeyMode("sk_test_abc")).toBe("test");
    expect(stripeKeyMode("sk_live_abc")).toBe("live");
    expect(stripeKeyMode("rk_live_abc")).toBeNull();
  });

  it("rejects preview deployments with live keys", () => {
    stubEnv("VERCEL_ENV", "preview");
    expect(() => assertStripeSecretKeyMatchesDeployEnvironment("sk_live_abc")).toThrow(/Preview/);
    expect(() => assertStripeSecretKeyMatchesDeployEnvironment("sk_test_abc")).not.toThrow();
  });

  it("allows test keys in production until go-live flag is set", () => {
    stubEnv("VERCEL_ENV", "production");
    stubEnv("TOWER_STRIPE_REQUIRE_LIVE_IN_PRODUCTION", undefined);
    expect(() => assertStripeSecretKeyMatchesDeployEnvironment("sk_test_abc")).not.toThrow();
  });

  it("requires live keys in production when go-live flag is set", () => {
    stubEnv("VERCEL_ENV", "production");
    stubEnv("TOWER_STRIPE_REQUIRE_LIVE_IN_PRODUCTION", "1");
    expect(() => assertStripeSecretKeyMatchesDeployEnvironment("sk_test_abc")).toThrow(/live Stripe secret key/);
    expect(() => assertStripeSecretKeyMatchesDeployEnvironment("sk_live_abc")).not.toThrow();
  });

  it("getStripePricePro trims env value", () => {
    stubEnv("STRIPE_PRICE_PRO", "  price_123  ");
    expect(getStripePricePro()).toBe("price_123");
  });
});
