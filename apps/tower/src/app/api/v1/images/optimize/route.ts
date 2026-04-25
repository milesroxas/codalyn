import { fileExtensionForFormat } from "@codalyn/webflow-kit";
import { optimizeImageBuffer, parseImageFormatParam } from "@/features/image-processing/lib/optimize-image";
import { resolveTowerEntitlement } from "@/server/billing/entitlements";
import { getActiveOrganizationIdForApiRequest } from "@/server/billing/session-org";
import { consumeImageOptimize } from "@/server/billing/usage-gate";
import { verifyTowerApiRequest } from "@/server/tower-api-auth";

export const runtime = "nodejs";
/** Large PNG in → AVIF out can exceed default limits on some hosts; adjust per deployment. */
export const maxDuration = 60;

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

  if (auth.userId) {
    const activeOrg = await getActiveOrganizationIdForApiRequest(req);
    const entitlement = await resolveTowerEntitlement(auth.userId, activeOrg);
    const usage = await consumeImageOptimize(auth.userId, entitlement);
    if (!usage.ok) {
      return usage.response;
    }
  }

  const url = new URL(req.url);
  const format = parseImageFormatParam(url.searchParams.get("format"));
  const qualityRaw = url.searchParams.get("quality");
  const quality = qualityRaw ? Number.parseInt(qualityRaw, 10) : 80;

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0) {
    return Response.json({ error: "Empty body" }, { status: 400 });
  }

  const { buffer, mimeType } = await optimizeImageBuffer(buf, format, Number.isFinite(quality) ? quality : 80);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="optimized.${fileExtensionForFormat(format)}"`,
    },
  });
}
