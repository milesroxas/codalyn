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

/** Display pieces of the seat cost preview, so the UI can emphasize the total separately. */
export type TeamSeatCostPreviewParts = {
  /** Formatted per-seat price, e.g. "$15.00". */
  perSeat: string;
  seats: number;
  /** Formatted recurring total, e.g. "$45.00". */
  total: string;
  /** Short interval suffix, e.g. "mo". */
  interval: string;
};

/**
 * Builds the display pieces of the "`$X/seat × N = $Y/mo`" preview shown before the admin leaves
 * for Stripe Checkout. Returns null when no price is available or the seat count is non-positive,
 * so the caller renders nothing.
 */
export function getTeamSeatCostPreviewParts(
  price: TeamSeatPrice | null,
  seats: number
): TeamSeatCostPreviewParts | null {
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
  return {
    perSeat: formatter.format(price.unitAmount / divisor),
    seats,
    total: formatter.format((price.unitAmount * seats) / divisor),
    interval: intervalSuffix(price.interval),
  };
}

/** Single-string form of {@link getTeamSeatCostPreviewParts}. */
export function formatTeamSeatCostPreview(price: TeamSeatPrice | null, seats: number): string | null {
  const parts = getTeamSeatCostPreviewParts(price, seats);
  if (!parts) {
    return null;
  }
  return `${parts.perSeat}/seat × ${parts.seats} = ${parts.total}/${parts.interval}`;
}
