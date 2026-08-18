import { after } from "next/server";
import {
  parseCmsLayoutSaveRequest,
  readUpstreamErrorMessage,
  resolveUserCmsLayoutFieldSlug,
  webflowCmsItemUrl,
} from "@/server/beacon-cms-layout";
import { resolveTowerEntitlement } from "@/server/billing/entitlements";
import { getActiveOrganizationIdForApiRequest } from "@/server/billing/session-org";
import { consumeCmsWrite, recordMeterCost } from "@/server/billing/usage-gate";
import { verifyTowerApiRequest } from "@/server/tower-api-auth";
import { resolveActiveOrganizationWebflowToken } from "@/server/webflow-proxy-token";
import { handleWebflowUpstreamRevocation } from "@/server/webflow-upstream-revocation";
import { isCmsSlotsSurfaceEnabled } from "@/shared/lib/cms-slots-surface-enabled";

export const runtime = "nodejs";

async function upstreamErrorResponse(upstream: Response): Promise<Response> {
  let upstreamBody: unknown = null;
  try {
    upstreamBody = await upstream.json();
  } catch {
    /* ignore */
  }
  const retryAfter = upstream.headers.get("Retry-After");
  const headers = retryAfter ? { "Retry-After": retryAfter } : undefined;
  return Response.json(
    {
      code: upstream.status === 429 ? "RATE_LIMITED" : "WEBFLOW_API_ERROR",
      message: readUpstreamErrorMessage(upstreamBody, upstream.status),
    },
    { status: upstream.status, headers }
  );
}

export async function POST(req: Request) {
  if (!isCmsSlotsSurfaceEnabled()) {
    return Response.json({ code: "NOT_FOUND", message: "Not found." }, { status: 404 });
  }
  const auth = await verifyTowerApiRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  if (!auth.userId) {
    return Response.json({ code: "SESSION_REQUIRED", message: "Session required." }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ code: "INVALID_JSON", message: "Invalid JSON body." }, { status: 400 });
  }
  const body = parseCmsLayoutSaveRequest(rawBody);
  if (!body) {
    return Response.json(
      { code: "INVALID_REQUEST", message: "Expected { collectionId, itemId, composition }." },
      { status: 400 }
    );
  }

  const fieldSlug = await resolveUserCmsLayoutFieldSlug(auth.userId);
  if (!fieldSlug) {
    return Response.json(
      {
        code: "MISSING_LAYOUT_FIELD_SLUG",
        message: "CMS layout field is not configured for this workspace.",
      },
      { status: 400 }
    );
  }

  const stored = await resolveActiveOrganizationWebflowToken({ userId: auth.userId, request: req });
  const webflowToken = stored?.accessToken;
  if (!stored || !webflowToken) {
    return Response.json({ code: "NO_WEBFLOW_TOKEN", message: "Connect Webflow in Tower first." }, { status: 503 });
  }

  const activeOrg = await getActiveOrganizationIdForApiRequest(req);
  const entitlement = await resolveTowerEntitlement(auth.userId, activeOrg);
  const usage = await consumeCmsWrite(auth.userId, entitlement, activeOrg);
  if (!usage.ok) {
    return usage.response;
  }

  // Measure active compute (local serialization) separately from the upstream Webflow round-trip, which
  // is I/O wait and not billed as Vercel active CPU.
  const computeStart = Date.now();
  const upstreamBody = JSON.stringify({
    fieldData: {
      [fieldSlug]: JSON.stringify(body.composition),
    },
  });
  const fetchStart = Date.now();
  const upstream = await fetch(webflowCmsItemUrl(body.collectionId, body.itemId), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${webflowToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: upstreamBody,
  });
  const fetchMs = Date.now() - fetchStart;

  if (!upstream.ok) {
    return (await handleWebflowUpstreamRevocation(upstream, stored)) ?? (await upstreamErrorResponse(upstream));
  }

  const responseBody = JSON.stringify({ composition: body.composition });
  if (usage.scope) {
    const computeMs = Math.max(0, Date.now() - computeStart - fetchMs);
    const egressBytes = Buffer.byteLength(responseBody);
    const scope = usage.scope;
    after(() => recordMeterCost(scope, "cmsWrite", { computeMs, egressBytes }));
  }
  return new Response(responseBody, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
