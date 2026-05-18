import {
  parseCmsLayoutSaveRequest,
  readUpstreamErrorMessage,
  resolveUserCmsLayoutFieldSlug,
  webflowCmsItemUrl,
} from "@/server/beacon-cms-layout";
import { resolveTowerEntitlement } from "@/server/billing/entitlements";
import { getActiveOrganizationIdForApiRequest } from "@/server/billing/session-org";
import { consumeWebflowRequest } from "@/server/billing/usage-gate";
import { verifyTowerApiRequest } from "@/server/tower-api-auth";
import { resolveWebflowBearerToken } from "@/server/webflow-proxy-token";
import { isCmsSlotsSurfaceEnabled } from "@/shared/lib/cms-slots-surface-enabled";

export const runtime = "nodejs";

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

  const webflowToken = await resolveWebflowBearerToken({ userId: auth.userId, request: req });
  if (!webflowToken) {
    return Response.json({ code: "NO_WEBFLOW_TOKEN", message: "Connect Webflow in Tower first." }, { status: 503 });
  }

  const activeOrg = await getActiveOrganizationIdForApiRequest(req);
  const entitlement = await resolveTowerEntitlement(auth.userId, activeOrg);
  const usage = await consumeWebflowRequest(auth.userId, entitlement);
  if (!usage.ok) {
    return usage.response;
  }

  const upstream = await fetch(webflowCmsItemUrl(body.collectionId, body.itemId), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${webflowToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      fieldData: {
        [fieldSlug]: JSON.stringify(body.composition),
      },
    }),
  });

  if (!upstream.ok) {
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

  return Response.json({ composition: body.composition }, { headers: { "Cache-Control": "no-store" } });
}
