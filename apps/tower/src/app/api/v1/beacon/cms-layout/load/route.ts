import {
  extractItemFieldData,
  parseCmsLayoutLoadRequest,
  parseCompositionFromField,
  readUpstreamErrorMessage,
  resolveUserCmsLayoutFieldSlug,
  webflowCmsItemUrl,
} from "@/server/beacon-cms-layout";
import { verifyTowerApiRequest } from "@/server/tower-api-auth";
import { resolveWebflowBearerToken } from "@/server/webflow-proxy-token";
import { isBeaconsSurfaceEnabled } from "@/shared/lib/beacons-surface-enabled";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isBeaconsSurfaceEnabled()) {
    return Response.json({ code: "NOT_FOUND", message: "Not found." }, { status: 404 });
  }
  const auth = await verifyTowerApiRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  if (!auth.userId) {
    return Response.json({ code: "SESSION_REQUIRED", message: "Session required." }, { status: 401 });
  }
  return handleLoadRequest(req, auth.userId);
}

async function handleLoadRequest(req: Request, userId: string): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ code: "INVALID_JSON", message: "Invalid JSON body." }, { status: 400 });
  }
  const body = parseCmsLayoutLoadRequest(rawBody);
  if (!body) {
    return Response.json({ code: "INVALID_REQUEST", message: "Expected { collectionId, itemId }." }, { status: 400 });
  }

  const fieldSlug = await resolveUserCmsLayoutFieldSlug(userId);
  if (!fieldSlug) {
    return Response.json(
      {
        code: "MISSING_LAYOUT_FIELD_SLUG",
        message: "CMS layout field is not configured for this workspace.",
      },
      { status: 400 }
    );
  }

  const webflowToken = await resolveWebflowBearerToken({ userId });
  if (!webflowToken) {
    return Response.json({ code: "NO_WEBFLOW_TOKEN", message: "Connect Webflow in Tower first." }, { status: 503 });
  }

  const upstream = await fetch(webflowCmsItemUrl(body.collectionId, body.itemId), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${webflowToken}`,
      Accept: "application/json",
    },
  });

  if (!upstream.ok) {
    return toUpstreamError(upstream);
  }

  let upstreamBody: unknown;
  try {
    upstreamBody = await upstream.json();
  } catch {
    return Response.json(
      { code: "INVALID_WEBFLOW_RESPONSE", message: "Webflow returned invalid JSON." },
      { status: 502 }
    );
  }

  const fieldData = extractItemFieldData(upstreamBody);
  if (!fieldData) {
    return Response.json(
      { code: "INVALID_WEBFLOW_RESPONSE", message: "Webflow item response did not include fieldData." },
      { status: 502 }
    );
  }

  const parsed = parseCompositionFromField(fieldData[fieldSlug]);
  if (!parsed.ok) {
    return Response.json({ code: parsed.code, message: parsed.message }, { status: 422 });
  }

  return Response.json({ composition: parsed.composition }, { headers: { "Cache-Control": "no-store" } });
}

async function toUpstreamError(upstream: Response): Promise<Response> {
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
