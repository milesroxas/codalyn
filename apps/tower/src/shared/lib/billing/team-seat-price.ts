/** Per-seat recurring price for team billing, as reported by Stripe (amount in the currency's minor unit). */
export type TeamSeatPrice = {
  /** Unit amount in the currency's smallest unit (e.g. cents for USD, whole yen for JPY). */
  unitAmount: number;
  /** ISO currency code from Stripe (lowercase, e.g. "usd"). */
  currency: string;
  /** Recurring billing interval from Stripe (e.g. "month", "year"). */
  interval: string;
};

/** Number of minor units per major unit for a currency (100 for USD, 1 for zero-decimal like JPY). */
function minorUnitDivisor(currency: string): number {
  try {
    const digits =
      new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
    return 10 ** digits;
  } catch {
    return 100;
  }
}

/** Short interval suffix for the cost line ("mo" / "yr"), falling back to the raw Stripe interval. */
function intervalSuffix(interval: string): string {
  if (interval === "month") {
    return "mo";
  }
  if (interval === "year") {
    return "yr";
  }
  return interval;
}

/**
 * Builds the "`$X/seat × N = $Y/mo`" preview shown before the admin leaves for Stripe Checkout.
 * Returns null when no price is available or the seat count is non-positive, so the caller renders nothing.
 */
export function formatTeamSeatCostPreview(price: TeamSeatPrice | null, seats: number): string | null {
  if (!price || !Number.isInteger(seats) || seats <= 0) {
    return null;
  }
  const currency = price.currency.toUpperCase();
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat("en-US", { style: "currency", currency });
  } catch {
    return null;
  }
  const divisor = minorUnitDivisor(currency);
  const perSeat = formatter.format(price.unitAmount / divisor);
  const total = formatter.format((price.unitAmount * seats) / divisor);
  const suffix = intervalSuffix(price.interval);
  return `${perSeat}/seat × ${seats} = ${total}/${suffix}`;
}
