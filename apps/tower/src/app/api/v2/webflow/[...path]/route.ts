import { classifyWebflowProxyUsage, webflowDataApiUrl } from "@codalyn/webflow-kit";
import { after } from "next/server";
import { resolveTowerEntitlement } from "@/server/billing/entitlements";
import { getActiveOrganizationIdForApiRequest } from "@/server/billing/session-org";
import { consumeWebflowProxy, recordMeterCost, type UsageScope } from "@/server/billing/usage-gate";
import { verifyTowerApiRequest } from "@/server/tower-api-auth";
import { isWebflowSiteId, linkOrganizationWebflowSites } from "@/server/webflow-organization-sites";
import { hasWebflowOAuthCredentials, resolveActiveOrganizationWebflowToken } from "@/server/webflow-proxy-token";
import { handleWebflowUpstreamRevocation } from "@/server/webflow-upstream-revocation";

const MAX_WEBFLOW_PROXY_SEGMENTS = 40;
const MAX_WEBFLOW_PROXY_SEGMENT_LEN = 200;

/**
 * Reject absurd path depth/length to limit upstream URL work and Vercel handler time
 * (target host is still fixed; `..` is not a useful segment for the Data API).
 */
function assertSafeWebflowProxySegments(segments: string[]): Response | null {
  if (segments.length > MAX_WEBFLOW_PROXY_SEGMENTS) {
    return Response.json({ error: "path_too_long" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  for (const seg of segments) {
    if (seg.length > MAX_WEBFLOW_PROXY_SEGMENT_LEN) {
      return Response.json(
        { error: "path_segment_too_long" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (seg === ".." || seg.includes("/") || seg.includes("\\")) {
      return Response.json({ error: "invalid_path" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
  }
  return null;
}

/** Meters the call against the caller's entitlement; returns the usage scope, or the 4xx to send back. */
async function consumeProxyUsage(
  req: Request,
  userId: string | null | undefined,
  segments: string[]
): Promise<UsageScope | null | Response> {
  if (!userId) {
    return null;
  }
  const activeOrg = await getActiveOrganizationIdForApiRequest(req);
  const entitlement = await resolveTowerEntitlement(userId, activeOrg);
  const usage = await consumeWebflowProxy(userId, entitlement, activeOrg, classifyWebflowProxyUsage(segments));
  return usage.ok ? usage.scope : usage.response;
}

/**
 * A successful `GET sites/{id}` proves this org's token reaches that site — record it (idempotent, after
 * the response) so the Designer ID-token exchange can pick this token for that site later.
 */
function recordSiteLinkFromProxyRead(res: Response, method: string, segments: string[], organizationId: string): void {
  if (!res.ok || method !== "GET" || segments.length !== 2 || segments[0] !== "sites") {
    return;
  }
  const siteId = segments[1];
  if (!isWebflowSiteId(siteId)) {
    return;
  }
  after(() => linkOrganizationWebflowSites(organizationId, [siteId]));
}

async function forward(req: Request, segments: string[]) {
  const auth = await verifyTowerApiRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  const badPath = assertSafeWebflowProxySegments(segments);
  if (badPath) {
    return badPath;
  }
  const stored = await resolveActiveOrganizationWebflowToken({ userId: auth.userId, request: req });
  const webflowToken = stored?.accessToken;
  if (!stored || !webflowToken) {
    return Response.json(
      {
        error: "No Webflow access token available",
        hint: hasWebflowOAuthCredentials()
          ? "Choose your team workspace in Tower, then have a workspace admin connect Webflow (or use the admin dashboard / Beacon flow) so an access token is stored for that workspace."
          : "Configure Webflow OAuth (WEBFLOW_CLIENT_ID, WEBFLOW_CLIENT_SECRET, optional WEBFLOW_REDIRECT_URI override) and connect from Tower.",
      },
      { status: 503 }
    );
  }

  const usage = await consumeProxyUsage(req, auth.userId, segments);
  if (usage instanceof Response) {
    return usage;
  }
  const usageScope = usage;

  // Proxy time is dominated by the upstream Webflow round-trip (I/O wait, not Vercel active CPU), so we
  // measure local handler compute as total local time minus the awaited fetch.
  const computeStart = Date.now();
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

  const fetchStart = Date.now();
  const res = await fetch(target, init);
  const fetchMs = Date.now() - fetchStart;

  // Webflow rejected the stored workspace token (revoked / app uninstalled): prune it and tell the
  // extension to reconnect instead of retrying a dead credential. 403 (missing scope) passes through.
  const revoked = await handleWebflowUpstreamRevocation(res, stored);
  if (revoked) {
    return revoked;
  }

  recordSiteLinkFromProxyRead(res, method, segments, stored.organizationId);

  const responseHeaders = new Headers(res.headers);
  responseHeaders.set("Cache-Control", "no-store");
  const response = new Response(res.body, { status: res.status, headers: responseHeaders });

  if (usageScope) {
    // Egress uses Content-Length to avoid buffering the streamed body (0 when the upstream omits it).
    const contentLength = Number.parseInt(res.headers.get("content-length") ?? "", 10);
    const computeMs = Math.max(0, Date.now() - computeStart - fetchMs);
    const scope = usageScope;
    after(() =>
      recordMeterCost(scope, "webflowProxy", {
        computeMs,
        egressBytes: Number.isFinite(contentLength) ? contentLength : 0,
      })
    );
  }
  return response;
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
