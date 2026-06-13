import { towerCorsHeadersFor } from "@/server/tower-cors";
import { establishDesignerBetterAuthSession } from "@/server/webflow-designer-session-logic";
import {
  pickBearerForWebflowIdTokenResolve,
  resolveWebflowDesignerIdToken,
} from "@/server/webflow-resolve-designer-id-token";

function jsonWithCors(request: Request, body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  for (const [k, v] of Object.entries(towerCorsHeadersFor(request))) {
    headers.set(k, v);
  }
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { ...init, headers });
}

export async function OPTIONS(request: Request) {
  const headers = new Headers();
  for (const [k, v] of Object.entries(towerCorsHeadersFor(request))) {
    headers.set(k, v);
  }
  return new Response(null, { status: 204, headers });
}

export async function POST(request: Request) {
  let parsed: { idToken?: string };
  try {
    parsed = (await request.json()) as { idToken?: string };
  } catch {
    return jsonWithCors(request, { error: "invalid_json" }, { status: 400 });
  }

  const idToken = typeof parsed.idToken === "string" ? parsed.idToken.trim() : "";
  if (!idToken) {
    return jsonWithCors(request, { error: "id_token_required" }, { status: 400 });
  }

  const resolveBearer = await pickBearerForWebflowIdTokenResolve(request);
  if (!resolveBearer) {
    return jsonWithCors(
      request,
      {
        error: "webflow_resolve_bearer_missing",
        hint: "Set WEBFLOW_TOKEN_RESOLVE_BEARER or WEBFLOW_API_TOKEN (scope authorized_user:read), connect Webflow on the Connection page, or sign in on Tower so a stored workspace token can resolve the Designer ID token.",
      },
      { status: 503 }
    );
  }

  const resolved = await resolveWebflowDesignerIdToken(idToken, resolveBearer);
  if (!resolved.ok) {
    // Surface *why* resolve failed so the client and operator can act, instead of a blanket 401.
    // Bearer problems are operator config (503, permanent for the client); only a rejected idToken is a
    // true 401 the client can retry with a fresh token.
    switch (resolved.reason) {
      case "bearer_invalid":
        return jsonWithCors(
          request,
          {
            error: "webflow_resolve_bearer_invalid",
            hint: "The Webflow resolve bearer was rejected (401). Set WEBFLOW_TOKEN_RESOLVE_BEARER to a valid Data Client token for the same Webflow App the extension is registered under.",
          },
          { status: 503 }
        );
      case "bearer_scope_missing":
        return jsonWithCors(
          request,
          {
            error: "webflow_resolve_scope_missing",
            hint: "The Webflow resolve bearer is missing scope authorized_user:read (403). Reauthorize the token with that scope.",
          },
          { status: 503 }
        );
      case "upstream_error":
      case "malformed_response":
        return jsonWithCors(
          request,
          { error: "webflow_resolve_upstream_error", hint: `Webflow token/resolve returned ${resolved.status}.` },
          { status: 502 }
        );
      case "id_token_rejected":
      default:
        return jsonWithCors(request, { error: "id_token_resolve_failed" }, { status: 401 });
    }
  }

  const session = await establishDesignerBetterAuthSession(resolved.user);
  if (!session.ok) {
    console.warn(
      `[tower/webflow-designer] establish session failed for ${resolved.user.email}: ${session.status} ${session.message}`
    );
    return jsonWithCors(request, { error: session.message }, { status: session.status });
  }

  return jsonWithCors(request, {
    user: session.user,
    token: session.token,
  });
}
