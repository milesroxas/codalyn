/** Errors where silent Designer exchange should stop until the user acts explicitly. */
const PERMANENT_DESIGNER_EXCHANGE_ERRORS = new Set([
  "early_access_required",
  "webflow_user_mismatch",
  // The silent `restore` intent found no Tower account for this Webflow user: not an error to retry —
  // the welcome screen's explicit "Continue with Webflow" (intent `sign_in`) is the way forward.
  "no_tower_account",
  "tower_not_configured",
  "webflow_resolve_bearer_missing",
  // Operator-side resolve-bearer config: retrying with fresh idTokens cannot fix it, so stop the storm.
  "webflow_resolve_bearer_invalid",
  "webflow_resolve_scope_missing",
  "no_session_token",
  "sign_up_failed",
  // Tower throttled this IP — immediate retries only extend the block window.
  "rate_limited",
]);

export function isPermanentDesignerExchangeFailure(error: string): boolean {
  const normalized = error.trim();
  if (!normalized) {
    return false;
  }
  if (PERMANENT_DESIGNER_EXCHANGE_ERRORS.has(normalized)) {
    return true;
  }
  if (/^http_5\d\d$/.test(normalized)) {
    return false;
  }
  if (normalized.startsWith("http_")) {
    return true;
  }
  return false;
}
