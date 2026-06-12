import {
  calculateImageOptimizationCredits,
  fileExtensionForFormat,
  type ImageExportFormat,
} from "@codalyn/webflow-kit";
import { after } from "next/server";
import {
  type ImageOptimizeTelemetry,
  logImageOptimizeTelemetry,
} from "@/features/image-processing/lib/image-optimize-telemetry";
import {
  IMAGE_OPTIMIZE_MAX_OUTPUT_EDGE,
  optimizeImageBuffer,
  parseImageFormatParam,
  readSourceImageMetadata,
  type SourceImageMetadata,
} from "@/features/image-processing/lib/optimize-image";
import { resolveTowerEntitlement, type TowerEntitlement, type TowerTier } from "@/server/billing/entitlements";
import { getActiveOrganizationIdForApiRequest } from "@/server/billing/session-org";
import { consumeImageOptimize, recordMeterCost, type UsageScope } from "@/server/billing/usage-gate";
import { verifyTowerApiRequest } from "@/server/tower-api-auth";

export const runtime = "nodejs";
/** Large PNG in → AVIF out can exceed default limits on some hosts; adjust per deployment. */
export const maxDuration = 60;

/** Reject unbounded `arrayBuffer()` reads (availability). Typical designer exports stay well under this. */
const MAX_INPUT_BYTES = 32 * 1024 * 1024;

type RequestContext = {
  userId: string | null;
  organizationId: string | null;
  tier: TowerTier | null;
  format: ImageExportFormat;
  quality: number;
};

/** Builds a telemetry logger bound to the request context so each call only supplies the variable fields. */
function makeTelemetryLogger(ctx: RequestContext) {
  return (fields: Partial<ImageOptimizeTelemetry> & Pick<ImageOptimizeTelemetry, "ok" | "inputBytes">): void => {
    logImageOptimizeTelemetry({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      tier: ctx.tier,
      plan: ctx.tier,
      format: ctx.format,
      quality: ctx.quality,
      outputBytes: null,
      width: null,
      height: null,
      credits: null,
      durationMs: 0,
      ...fields,
    });
  };
}

type Prepared =
  | { ok: false; response: Response }
  | { ok: true; metadata: SourceImageMetadata; credits: number; chargedCredits: number; scope: UsageScope | null };

/**
 * Validates the buffer, parses dimensions, enforces hard safety caps, and reserves the calculated
 * image optimization credits — all before encoding. Returns a 4xx `Response` when blocked.
 */
async function prepareOptimize(
  buf: Buffer,
  log: ReturnType<typeof makeTelemetryLogger>,
  userId: string | null,
  entitlement: TowerEntitlement | null,
  activeOrg: string | null,
  format: ImageExportFormat
): Promise<Prepared> {
  // Read dimensions before metering so credits reflect real processing effort — never charge before
  // the cost is known (parse Sharp metadata first).
  const metadata = await readSourceImageMetadata(buf);
  if (!metadata) {
    log({ ok: false, inputBytes: buf.length, errorCode: "UNREADABLE_IMAGE" });
    return {
      ok: false,
      response: Response.json({ error: "Unreadable image", code: "UNREADABLE_IMAGE" }, { status: 400 }),
    };
  }

  if (metadata.width > IMAGE_OPTIMIZE_MAX_OUTPUT_EDGE || metadata.height > IMAGE_OPTIMIZE_MAX_OUTPUT_EDGE) {
    log({
      ok: false,
      inputBytes: buf.length,
      width: metadata.width,
      height: metadata.height,
      errorCode: "DIMENSIONS_TOO_LARGE",
    });
    return {
      ok: false,
      response: Response.json({ error: "Image dimensions too large", code: "DIMENSIONS_TOO_LARGE" }, { status: 413 }),
    };
  }

  const credits = calculateImageOptimizationCredits({
    outputWidth: metadata.width,
    outputHeight: metadata.height,
    format,
    inputBytes: buf.length,
  });

  if (!(userId && entitlement)) {
    return { ok: true, metadata, credits, chargedCredits: 0, scope: null };
  }

  const usage = await consumeImageOptimize(userId, entitlement, activeOrg, credits);
  if (!usage.ok) {
    log({
      ok: false,
      inputBytes: buf.length,
      width: metadata.width,
      height: metadata.height,
      credits,
      errorCode: "TOWER_USAGE_LIMIT",
    });
    return { ok: false, response: usage.response };
  }
  return { ok: true, metadata, credits, chargedCredits: usage.limit === null ? 0 : credits, scope: usage.scope };
}

export async function POST(req: Request) {
  const auth = await verifyTowerApiRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  if (process.env.VERCEL && !auth.userId) {
    return Response.json(
      {
        error:
          "Session required for image optimization on Tower Cloud. Sign in to Tower (Beacon session) so usage can be metered, or use WebP in the extension without calling this endpoint.",
        code: "SESSION_REQUIRED",
      },
      { status: 401 }
    );
  }

  const activeOrg = auth.userId ? await getActiveOrganizationIdForApiRequest(req) : null;
  const entitlement = auth.userId ? await resolveTowerEntitlement(auth.userId, activeOrg) : null;

  const url = new URL(req.url);
  const format = parseImageFormatParam(url.searchParams.get("format"));
  const qualityRaw = url.searchParams.get("quality");
  const parsedQuality = qualityRaw ? Number.parseInt(qualityRaw, 10) : 80;
  const quality = Number.isFinite(parsedQuality) ? parsedQuality : 80;

  const log = makeTelemetryLogger({
    userId: auth.userId ?? null,
    organizationId: activeOrg,
    tier: entitlement?.tier ?? null,
    format,
    quality,
  });

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0) {
    return Response.json({ error: "Empty body" }, { status: 400 });
  }
  if (buf.length > MAX_INPUT_BYTES) {
    log({ ok: false, inputBytes: buf.length, errorCode: "PAYLOAD_TOO_LARGE" });
    return Response.json({ error: "Body too large", code: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  const prepared = await prepareOptimize(buf, log, auth.userId ?? null, entitlement, activeOrg, format);
  if (!prepared.ok) {
    return prepared.response;
  }
  const { metadata, chargedCredits, scope } = prepared;

  const startedAt = Date.now();
  try {
    const { buffer, mimeType } = await optimizeImageBuffer(buf, format, quality);
    const durationMs = Date.now() - startedAt;
    log({
      ok: true,
      inputBytes: buf.length,
      outputBytes: buffer.length,
      width: metadata.width,
      height: metadata.height,
      credits: chargedCredits,
      durationMs,
    });

    // AVIF/WebP encode is CPU-bound, so wall-clock ≈ Vercel active compute; output buffer length is the
    // egress (Fast Data Transfer) we serve. Record after the response so it never adds request latency.
    if (scope) {
      after(() => recordMeterCost(scope, "image", { computeMs: durationMs, egressBytes: buffer.length }));
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="optimized.${fileExtensionForFormat(format)}"`,
      },
    });
  } catch (error) {
    log({
      ok: false,
      inputBytes: buf.length,
      width: metadata.width,
      height: metadata.height,
      credits: chargedCredits,
      durationMs: Date.now() - startedAt,
      errorCode: "OPTIMIZE_FAILED",
    });
    throw error;
  }
}
