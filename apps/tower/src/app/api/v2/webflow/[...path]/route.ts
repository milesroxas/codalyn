import { webflowDataApiUrl } from "@codalyn/webflow-kit";
import { resolveTowerEntitlement } from "@/server/billing/entitlements";
import { getActiveOrganizationIdForApiRequest } from "@/server/billing/session-org";
import { consumeWebflowRequest } from "@/server/billing/usage-gate";
import { verifyTowerApiRequest } from "@/server/tower-api-auth";
import { hasWebflowOAuthCredentials, resolveWebflowBearerToken } from "@/server/webflow-proxy-token";

async function forward(req: Request, segments: string[]) {
  const auth = await verifyTowerApiRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  const webflowToken = await resolveWebflowBearerToken({ userId: auth.userId });
  if (!webflowToken) {
    return Response.json(
      {
        error: "No Webflow access token available",
        hint: hasWebflowOAuthCredentials()
          ? "Sign in to Tower and connect Webflow (POST /api/integrations/webflow/authorize from Beacon, or the dashboard flow) so an access token is stored for your user."
          : "Configure Webflow OAuth (WEBFLOW_CLIENT_ID, WEBFLOW_CLIENT_SECRET, optional WEBFLOW_REDIRECT_URI override) and connect your account from Beacon.",
      },
      { status: 503 }
    );
  }

  if (auth.userId) {
    const activeOrg = await getActiveOrganizationIdForApiRequest(req);
    const entitlement = await resolveTowerEntitlement(auth.userId, activeOrg);
    const usage = await consumeWebflowRequest(auth.userId, entitlement);
    if (!usage.ok) {
      return usage.response;
    }
  }

  const target = webflowDataApiUrl(segments);
  const src = new URL(req.url);
  target.search = src.search;

  const method = req.method;
  const outHeaders = new Headers();
  outHeaders.set("Authorization", `Bearer ${webflowToken}`);
  outHeaders.set("Accept", req.headers.get("Accept") ?? "application/json");

  const contentType = req.headers.get("Content-Type");
  if (contentType && method !== "GET" && method !== "HEAD") {
    outHeaders.set("Content-Type", contentType);
  }

  const init: RequestInit = {
    method,
    headers: outHeaders,
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const res = await fetch(target, init);
  const responseHeaders = new Headers(res.headers);
  responseHeaders.set("Cache-Control", "no-store");
  return new Response(res.body, { status: res.status, headers: responseHeaders });
}

export async function GET(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path ?? []);
}

export async function POST(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path ?? []);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path ?? []);
}

export async function PUT(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path ?? []);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path ?? []);
}
