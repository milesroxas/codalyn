import { fileExtensionForFormat } from "@codalyn/webflow-kit";
import { headers } from "next/headers";
import { optimizeImageBuffer, parseImageFormatParam } from "@/features/image-processing/lib/optimize-image";
import { auth } from "@/server/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
