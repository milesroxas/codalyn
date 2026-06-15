import { towerCorsHeadersFor } from "@/server/tower-cors";
import { normalizeWebflowAppKey } from "@/server/webflow-app-registry";
import { establishDesignerBetterAuthSession } from "@/server/webflow-designer-session-logic";
import {
  collectWebflowIdTokenResolveBearers,
  decideDesignerResolveFailure,
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
  let parsed: { idToken?: string; app?: string };
  try {
    parsed = (await request.json()) as { idToken?: string; app?: string };
  } catch {
    return jsonWithCors(request, { error: "invalid_json" }, { status: 400 });
  }

  const idToken = typeof parsed.idToken === "string" ? parsed.idToken.trim() : "";
  if (!idToken) {
    return jsonWithCors(request, { error: "id_token_required" }, { status: 400 });
  }

  // Which Webflow app issued this ID token — selects the matching app's resolve bearer (cross-app
  // resolves are rejected by Webflow). Untagged requests default to Beacon for back-compat.
  const app = normalizeWebflowAppKey(parsed.app);
  const candidates = await collectWebflowIdTokenResolveBearers(request, app);
  if (candidates.length === 0) {
    const bearerVar = app === "flint" ? "WEBFLOW_FLINT_TOKEN_RESOLVE_BEARER" : "WEBFLOW_TOKEN_RESOLVE_BEARER";
    return jsonWithCors(
      request,
      {
        error: "webflow_resolve_bearer_missing",
        hint: `No resolve bearer for the ${app} app. Set ${bearerVar} to a ${app}-app Data Client token (scope authorized_user:read)${
          app === "beacon" ? ", or connect Webflow on Tower so a stored workspace token can resolve it" : ""
        }.`,
      },
      { status: 503 }
    );
  }

  // Resolve with the primary candidate only (one Webflow call per request — the idToken stays unused for
  // a possible fresh-idToken client retry). On a revoked stored token we prune it and let the next
  // attempt pick the next candidate; see decideDesignerResolveFailure.
  const [primary, ...rest] = candidates;
  const resolved = await resolveWebflowDesignerIdToken(idToken, primary.token);
  if (!resolved.ok) {
    const action = decideDesignerResolveFailure(resolved, primary, rest.length > 0);
    if (action.pruneOrganizationId) {
      const { deleteOrganizationWebflowOAuthToken } = await import("@/server/webflow-proxy-token");
      await deleteOrganizationWebflowOAuthToken(action.pruneOrganizationId, app);
      console.warn(
        `[tower/webflow-designer] pruned revoked Webflow token for org ${action.pruneOrganizationId}; reconnect required (no refresh token)`
      );
    }
    const { error, status, hint } = action.response;
    return jsonWithCors(request, hint ? { error, hint } : { error }, { status });
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
