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
  if (!resolved) {
    console.warn("[tower/webflow-designer] id_token_resolve_failed (resolve bearer present but resolve returned null)");
    return jsonWithCors(request, { error: "id_token_resolve_failed" }, { status: 401 });
  }

  const session = await establishDesignerBetterAuthSession(resolved);
  if (!session.ok) {
    console.warn(
      `[tower/webflow-designer] establish session failed for ${resolved.email}: ${session.status} ${session.message}`
    );
    return jsonWithCors(request, { error: session.message }, { status: session.status });
  }

  return jsonWithCors(request, {
    user: session.user,
    token: session.token,
  });
}
