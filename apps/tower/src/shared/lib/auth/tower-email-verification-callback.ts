import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";
import { TOWER_CONNECTION_STATUS_QUERY } from "@/shared/lib/navigation/tower-app-paths";

/** @deprecated Legacy flash query param from pre-cookie verification redirects. Stripped on read. */
export const TOWER_EMAIL_VERIFIED_QUERY = "emailVerified";

const TRANSIENT_VERIFICATION_CALLBACK_QUERY_PARAMS = [
  TOWER_EMAIL_VERIFIED_QUERY,
  TOWER_CONNECTION_STATUS_QUERY,
  "webflow",
] as const;

/** Better Auth verify-email redirect errors (lowercase codes in ?error=). */
export function isEmailVerificationRedirectError(error: string | null | undefined): boolean {
  if (!error?.trim()) {
    return false;
  }
  const normalized = error.trim().toLowerCase();
  return (
    normalized === "invalid_token" ||
    normalized === "token_expired" ||
    normalized === "user_not_found" ||
    normalized === "invalid_user"
  );
}

/** Remove legacy ?emailVerified=1 from in-flight verification links. */
export function stripLegacyEmailVerifiedQueryParam(pathWithQuery: string): string {
  const queryIndex = pathWithQuery.indexOf("?");
  if (queryIndex === -1) {
    return pathWithQuery;
  }
  const path = pathWithQuery.slice(0, queryIndex);
  const params = new URLSearchParams(pathWithQuery.slice(queryIndex + 1));
  params.delete(TOWER_EMAIL_VERIFIED_QUERY);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

/** Strip legacy flash params and transient OAuth/UI status params from verification callbacks. */
export function stripTransientVerificationCallbackQueryParams(pathWithQuery: string): string {
  const queryIndex = pathWithQuery.indexOf("?");
  if (queryIndex === -1) {
    return pathWithQuery;
  }
  const path = pathWithQuery.slice(0, queryIndex);
  const params = new URLSearchParams(pathWithQuery.slice(queryIndex + 1));
  for (const key of TRANSIENT_VERIFICATION_CALLBACK_QUERY_PARAMS) {
    params.delete(key);
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

/** Same-origin post-verify destination — no flash or transient query params. */
export function resolveTowerEmailVerificationCallbackPath(path = "/"): string {
  return stripTransientVerificationCallbackQueryParams(sanitizeRelativePath(path));
}
