/**
 * Pure decisions for the Designer-initiated (DB-state) Webflow OAuth flow. Kept free of DB/HTTP so the
 * binding rules are unit-testable:
 *
 *  - a state row is single-use and expires {@link WEBFLOW_OAUTH_STATE_TTL_MS} after minting;
 *  - the Webflow user who *approves* the OAuth must be the Webflow user who *minted* the state
 *    (known from their Designer session), so a forwarded authorize URL can never deposit the
 *    approver's workspace token into the minter's Tower organization.
 */

/** Ten minutes: ample for the Webflow consent screen, short enough that a leaked URL goes stale. */
export const WEBFLOW_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export type WebflowOAuthStateRow = {
  userId: string;
  organizationId: string;
  appKey: string;
  webflowAuthorizedUserId: string | null;
  createdAt: Date;
};

export type WebflowOAuthStateBindingError = "invalid_state" | "state_expired";

export function isWebflowOAuthStateExpired(createdAt: Date, now: Date, ttlMs = WEBFLOW_OAUTH_STATE_TTL_MS): boolean {
  const age = now.getTime() - createdAt.getTime();
  return !Number.isFinite(age) || age < 0 || age > ttlMs;
}

/**
 * Validates a looked-up state row before any code exchange happens. Legacy rows without a bound Webflow
 * user id are rejected outright — there is no safe way to complete them.
 */
export function validateWebflowOAuthStateRow(
  row: WebflowOAuthStateRow | null | undefined,
  now: Date
):
  | { ok: true; row: WebflowOAuthStateRow & { webflowAuthorizedUserId: string } }
  | { ok: false; error: WebflowOAuthStateBindingError } {
  if (!row?.organizationId || !row.userId) {
    return { ok: false, error: "invalid_state" };
  }
  const bound = typeof row.webflowAuthorizedUserId === "string" ? row.webflowAuthorizedUserId.trim() : "";
  if (!bound) {
    return { ok: false, error: "invalid_state" };
  }
  if (!(row.createdAt instanceof Date) || isWebflowOAuthStateExpired(row.createdAt, now)) {
    return { ok: false, error: "state_expired" };
  }
  return { ok: true, row: { ...row, webflowAuthorizedUserId: bound } };
}

/**
 * True only when Webflow proved the exchanged token belongs to the same Webflow user who minted the
 * state. An unknown identity (null) is never a match.
 */
export function isWebflowOAuthApproverBound(
  expectedWebflowUserId: string,
  actualWebflowUserId: string | null
): boolean {
  const expected = expectedWebflowUserId.trim();
  const actual = actualWebflowUserId?.trim() ?? "";
  return expected.length > 0 && actual.length > 0 && expected === actual;
}
