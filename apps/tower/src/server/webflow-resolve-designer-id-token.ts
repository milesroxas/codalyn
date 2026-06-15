import {
  DEFAULT_WEBFLOW_APP_KEY,
  resolveWebflowAppBearer,
  type WebflowAppKey,
  webflowAppUsesStoredOAuthTokens,
} from "@/server/webflow-app-registry";

const RESOLVE_URL = "https://api.webflow.com/beta/token/resolve";

export type WebflowResolvedDesignerUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  siteId: string | null;
};

/**
 * Why a resolve failed. Distinguishes operator misconfig (the resolve bearer is bad/under-scoped)
 * from a genuinely bad idToken, so the route can return an actionable status instead of a blanket 401.
 * @see https://developers.webflow.com/data/v2.0.0-beta/reference/token/resolve
 */
export type WebflowResolveFailureReason =
  | "bearer_invalid" // Webflow 401 — resolve bearer invalid/revoked (operator config)
  | "bearer_scope_missing" // Webflow 403 — bearer lacks authorized_user:read (operator config)
  | "id_token_rejected" // Webflow 400 — idToken malformed/expired/wrong app (caller's token)
  | "upstream_error" // any other non-200 from Webflow (outage, 5xx)
  | "malformed_response"; // Webflow 200 but missing id/email

export type WebflowDesignerResolveResult =
  | { ok: true; user: WebflowResolvedDesignerUser }
  | { ok: false; reason: WebflowResolveFailureReason; status: number; detail: string };

function pickString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function reasonForUpstreamStatus(status: number): WebflowResolveFailureReason {
  if (status === 401) {
    return "bearer_invalid";
  }
  if (status === 403) {
    return "bearer_scope_missing";
  }
  if (status === 400) {
    return "id_token_rejected";
  }
  return "upstream_error";
}

export async function resolveWebflowDesignerIdToken(
  idToken: string,
  dataApiBearer: string
): Promise<WebflowDesignerResolveResult> {
  const res = await fetch(RESOLVE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${dataApiBearer}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    const reason = reasonForUpstreamStatus(res.status);
    console.warn(`[tower/webflow-designer] token/resolve failed: ${res.status} (${reason}) ${detail}`);
    return { ok: false, reason, status: res.status, detail };
  }

  const raw = (await res.json()) as Record<string, unknown>;
  const id = pickString(raw.userId) ?? pickString(raw.id) ?? pickString(raw.user_id);
  const email = pickString(raw.email)?.toLowerCase();
  if (!id || !email) {
    console.warn("[tower/webflow-designer] token/resolve ok but missing id/email in response");
    return { ok: false, reason: "malformed_response", status: res.status, detail: "missing id/email" };
  }

  return {
    ok: true,
    user: {
      id,
      email,
      firstName: pickString(raw.firstName) ?? pickString(raw.first_name) ?? null,
      lastName: pickString(raw.lastName) ?? pickString(raw.last_name) ?? null,
      siteId: pickString(raw.siteId) ?? pickString(raw.site_id) ?? null,
    },
  };
}

/**
 * A bearer candidate for `POST /beta/token/resolve` (scope `authorized_user:read`).
 * `organizationId` is set when the token came from a stored workspace OAuth row — those can be pruned
 * if Webflow rejects them. The env-fallback candidate has no `organizationId` (operator-owned).
 */
export type WebflowResolveBearerCandidate = { token: string; organizationId?: string };

/**
 * Ordered, de-duplicated resolve-bearer candidates for the app that issued the ID token.
 *
 * A Designer ID token can only be resolved by a Data Client token from the SAME Webflow app (Webflow
 * 400s cross-app resolves), so candidates are scoped by `app`:
 *  - Apps that connect to the Data API (Beacon): stored workspace OAuth tokens (active first), then
 *    that app's operator bearer. Stored tokens can be pruned on rejection (no refresh tokens exist).
 *  - Designer-only apps (Flint): just that app's operator bearer — stored Beacon tokens would 400.
 */
export async function collectWebflowIdTokenResolveBearers(
  request: Request,
  app: WebflowAppKey = DEFAULT_WEBFLOW_APP_KEY
): Promise<WebflowResolveBearerCandidate[]> {
  const candidates: WebflowResolveBearerCandidate[] = [];
  const seenOrgIds = new Set<string>();
  const seenTokens = new Set<string>();

  const pushOrgToken = (row: { organizationId: string; accessToken: string }) => {
    if (seenOrgIds.has(row.organizationId) || seenTokens.has(row.accessToken)) {
      return;
    }
    seenOrgIds.add(row.organizationId);
    seenTokens.add(row.accessToken);
    candidates.push({ token: row.accessToken, organizationId: row.organizationId });
  };

  if (webflowAppUsesStoredOAuthTokens(app)) {
    // Lazy-imported so unit tests can exercise resolveWebflowDesignerIdToken without the DB/auth stack.
    const { resolveActiveOrganizationWebflowToken, listOrganizationWebflowTokens } = await import(
      "@/server/webflow-proxy-token"
    );
    const active = await resolveActiveOrganizationWebflowToken({ requestHeaders: request.headers, app });
    if (active) {
      pushOrgToken(active);
    }
    for (const row of await listOrganizationWebflowTokens(app)) {
      pushOrgToken(row);
    }
  }

  const envBearer = resolveWebflowAppBearer(app);
  if (envBearer && !seenTokens.has(envBearer)) {
    candidates.push({ token: envBearer });
  }

  return candidates;
}

/** Action the route should take after a failed resolve attempt with the primary bearer candidate. */
export type DesignerResolveFailureAction = {
  /** When set, delete this org's stored token (Webflow rejected it and there is no refresh). */
  pruneOrganizationId?: string;
  response: { error: string; status: number; hint?: string };
};

/**
 * Pure mapping from a failed resolve + primary candidate → the route's response and any token to prune.
 * Keeps the route thin and makes the self-heal decision unit-testable without the DB.
 */
export function decideDesignerResolveFailure(
  result: Extract<WebflowDesignerResolveResult, { ok: false }>,
  primary: WebflowResolveBearerCandidate,
  hasRemainingCandidates: boolean
): DesignerResolveFailureAction {
  if (result.reason === "bearer_invalid" && primary.organizationId) {
    // A STORED token was rejected (revoked / app uninstalled). No refresh token exists, so prune it.
    // If another bearer remains, signal a transient retry (id_token_resolve_failed) so the client's
    // next fresh-idToken attempt picks it up; otherwise it's a hard, operator-actionable failure.
    if (hasRemainingCandidates) {
      return {
        pruneOrganizationId: primary.organizationId,
        response: { error: "id_token_resolve_failed", status: 401 },
      };
    }
    return {
      pruneOrganizationId: primary.organizationId,
      response: {
        error: "webflow_resolve_bearer_invalid",
        status: 503,
        hint: "The stored Webflow token was revoked. Reconnect Webflow on Tower — Webflow issues no refresh tokens.",
      },
    };
  }

  switch (result.reason) {
    case "bearer_invalid":
      // Non-prunable (env) bearer rejected — operator config.
      return {
        response: {
          error: "webflow_resolve_bearer_invalid",
          status: 503,
          hint: "WEBFLOW_TOKEN_RESOLVE_BEARER was rejected (401). Replace it with a valid Data Client token for this app.",
        },
      };
    case "bearer_scope_missing":
      return {
        response: {
          error: "webflow_resolve_scope_missing",
          status: 503,
          hint: "The Webflow resolve bearer is missing scope authorized_user:read (403). Reconnect/regenerate with that scope.",
        },
      };
    case "upstream_error":
    case "malformed_response":
      return {
        response: {
          error: "webflow_resolve_upstream_error",
          status: 502,
          hint: `Webflow token/resolve returned ${result.status}.`,
        },
      };
    case "id_token_rejected":
    default:
      return { response: { error: "id_token_resolve_failed", status: 401 } };
  }
}
