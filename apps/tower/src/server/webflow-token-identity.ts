import { webflowDataApiUrl } from "@codalyn/webflow-kit";

/** Bounded so a slow Webflow never pins the OAuth callback (Vercel function) open. */
const AUTHORIZED_BY_TIMEOUT_MS = 10_000;

function pickString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

/**
 * Normalizes `GET /v2/token/authorized_by` payloads to the Webflow user id. Webflow documents `id`;
 * `userId`/`user_id` are accepted as equivalent runtime shapes (same field the ID-token resolve returns).
 * Exported for tests; returns null on anything that is not a non-empty string id.
 */
export function readWebflowAuthorizedUserId(raw: unknown): string | null {
  if (raw === null || typeof raw !== "object") {
    return null;
  }
  const rec = raw as Record<string, unknown>;
  return pickString(rec.id) ?? pickString(rec.userId) ?? pickString(rec.user_id);
}

/**
 * Identity of the Webflow user who authorized `accessToken` (`GET /v2/token/authorized_by`, scope
 * `authorized_user:read`). Returns null when Webflow rejects the token, the response is malformed, or
 * the call fails — callers must treat null as "cannot prove identity" and refuse, never as a match.
 * @see https://developers.webflow.com/data/reference/token/authorized-by
 */
export async function fetchWebflowAuthorizedUserId(
  accessToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  try {
    const res = await fetchImpl(webflowDataApiUrl(["token", "authorized_by"]), {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      signal: AbortSignal.timeout(AUTHORIZED_BY_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[tower/webflow-oauth] token/authorized_by failed: ${res.status}`);
      return null;
    }
    return readWebflowAuthorizedUserId(await res.json());
  } catch (error) {
    console.warn(`[tower/webflow-oauth] token/authorized_by error: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}
