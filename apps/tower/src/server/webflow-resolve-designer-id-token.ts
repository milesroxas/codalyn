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
 * Bearer for `POST /beta/token/resolve` must have Webflow scope `authorized_user:read`.
 * Prefer the signed-in user's stored OAuth access token; else env (see `.env.example`).
 */
export async function pickBearerForWebflowIdTokenResolve(request: Request): Promise<string | undefined> {
  // Lazy-imported so unit tests can exercise resolveWebflowDesignerIdToken without loading the DB/auth stack.
  const { auth } = await import("@/server/auth");
  const { pickAnyOrganizationWebflowAccessToken, resolveWebflowBearerToken } = await import(
    "@/server/webflow-proxy-token"
  );

  const session = await auth.api.getSession({ headers: request.headers });
  if (session?.user?.id) {
    const t = await resolveWebflowBearerToken({ userId: session.user.id, requestHeaders: request.headers });
    if (t) {
      return t;
    }
  }

  const orgToken = await pickAnyOrganizationWebflowAccessToken();
  if (orgToken) {
    return orgToken;
  }

  return process.env.WEBFLOW_TOKEN_RESOLVE_BEARER?.trim() || process.env.WEBFLOW_API_TOKEN?.trim() || undefined;
}
