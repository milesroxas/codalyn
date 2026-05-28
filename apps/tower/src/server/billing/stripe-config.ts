/** Canonical Stripe env readers and deploy-environment key guards. */

export type StripeKeyMode = "test" | "live";

function readEnvNonEmpty(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

export function readStripeSecretKey(): string | null {
  return readEnvNonEmpty("STRIPE_SECRET_KEY");
}

export function stripeKeyMode(key: string): StripeKeyMode | null {
  if (key.startsWith("sk_test_")) {
    return "test";
  }
  if (key.startsWith("sk_live_")) {
    return "live";
  }
  return null;
}

/**
 * Guards against cross-environment Stripe misconfiguration.
 *
 * - Preview never uses live keys.
 * - Production allows test keys while building; set `TOWER_STRIPE_REQUIRE_LIVE_IN_PRODUCTION=1` at go-live.
 */
export function assertStripeSecretKeyMatchesDeployEnvironment(key: string): void {
  const mode = stripeKeyMode(key);
  if (!mode) {
    throw new Error("STRIPE_SECRET_KEY must start with sk_test_ or sk_live_.");
  }

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "preview" && mode === "live") {
    throw new Error(
      "Preview deployments must use Stripe test keys (sk_test_). Configure Preview-scoped STRIPE_SECRET_KEY in Vercel."
    );
  }

  if (
    vercelEnv === "production" &&
    mode === "test" &&
    process.env.TOWER_STRIPE_REQUIRE_LIVE_IN_PRODUCTION?.trim() === "1"
  ) {
    throw new Error(
      "Production requires a live Stripe secret key (sk_live_). Set live keys in Vercel Production before enabling TOWER_STRIPE_REQUIRE_LIVE_IN_PRODUCTION."
    );
  }
}

/** Recurring Price id for individual Pro checkout. */
export function getStripePricePro(): string | null {
  return readEnvNonEmpty("STRIPE_PRICE_PRO");
}

/** Per-seat recurring Price id for workspace (team) billing. */
export function getStripePriceTeamSeat(): string | null {
  return readEnvNonEmpty("STRIPE_PRICE_TEAM_SEAT");
}

export function isTeamBillingCheckoutConfigured(): boolean {
  return Boolean(getStripePriceTeamSeat());
}
