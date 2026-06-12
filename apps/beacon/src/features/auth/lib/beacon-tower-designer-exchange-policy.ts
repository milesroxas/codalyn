/** Errors where silent Designer exchange should stop until the user acts explicitly. */
const PERMANENT_DESIGNER_EXCHANGE_ERRORS = new Set([
  "early_access_required",
  "webflow_user_mismatch",
  "tower_not_configured",
  "webflow_resolve_bearer_missing",
  "no_session_token",
  "sign_up_failed",
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
