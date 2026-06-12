/**
 * Pure seat-quantity math and boundary normalization for team (per-seat) billing.
 *
 * No DB or Stripe access — callers supply already-resolved counts so this stays unit-testable and is
 * the single source of truth for how the team minimum, current usage, purchased quantity, and a
 * user-selected seat count combine.
 */

/** Billable floor for a team workspace: never below the team minimum or the seats currently in use. */
export function resolveSeatFloor(minSeats: number, seatsUsed: number): number {
  return Math.max(minSeats, seatsUsed);
}

/**
 * Normalize a client-supplied seat quantity (HTML form value or JSON body) into a positive integer.
 * Returns null when the value is absent or malformed (empty, non-numeric, decimal, zero, negative),
 * so the caller can fall back to the billable floor rather than partially apply bad input.
 */
export function parseRequestedSeatQuantity(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) {
      return null;
    }
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

/**
 * Seat quantity to bill on checkout: the user-selected seat count clamped into `[seatFloor, maxSeats]`.
 * Defaults to the floor when no valid selection was provided, never undercharges below the floor, and
 * caps an over-large request at `maxSeats` (the upper bound is never pulled below the floor).
 */
export function resolveCheckoutSeatQuantity(
  seatFloor: number,
  requestedSeats: number | null,
  maxSeats: number
): number {
  const upperBound = Math.max(seatFloor, maxSeats);
  if (requestedSeats == null) {
    return seatFloor;
  }
  return Math.min(Math.max(seatFloor, requestedSeats), upperBound);
}

/**
 * Seat quantity to reconcile with Stripe when membership changes. Sync is **grow-only**: it raises the
 * subscription to fit new members but never drops below the seats already purchased — admins reduce
 * seats deliberately via the Stripe Customer Portal (the resulting decrease flows back through the
 * webhook), not implicitly by removing a member.
 */
export function resolveSyncedSeatQuantity(seatFloor: number, currentQuantity: number | null): number {
  return Math.max(seatFloor, currentQuantity ?? 0);
}
