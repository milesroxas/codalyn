import {
  DEFAULT_IMAGE_EXPORT_FORMAT,
  fileExtensionForFormat,
  type ImageExportFormat,
  mimeTypeForFormat,
} from "@codalyn/webflow-kit";
import { canvasToBlob } from "@/features/image-editor/lib/canvas-to-blob";
import { sanitizeAssetBaseName } from "@/features/image-editor/lib/sanitize-asset-base-name";
import { getTowerOrigin, towerFetch } from "@/shared/lib/tower-client";
import { parseTowerUsageLimitBody, TowerUsageLimitError } from "@/shared/lib/tower-usage-limit-error";
import { waitForNextPaint } from "@/shared/lib/wait-for-next-paint";

export type EncodedImage = {
  blob: Blob;
  fileName: string;
  mimeType: string;
};

async function assertTowerOptimizeResponseOk(res: Response): Promise<void> {
  if (res.ok) {
    return;
  }
  const detail = await res.text();
  if (res.status === 402) {
    const usageLimit = parseTowerUsageLimitBody(detail);
    if (usageLimit != null) {
      throw new TowerUsageLimitError(usageLimit);
    }
  }
  // Raw response bodies are developer detail — log them, never surface them in the UI.
  console.warn(`[beacon] AVIF conversion request failed (${res.status})`, detail.slice(0, 240) || res.statusText);
  if (res.status === 401) {
    throw new Error("AVIF conversion needs a signed-in account. Sign in from Settings, or export WebP instead.");
  }
  throw new Error(`AVIF conversion failed (${res.status}). Try again in a moment, or export WebP instead.`);
}

async function encodeAvifViaTower(
  canvas: HTMLCanvasElement,
  qualityPercent: number,
  baseName: string
): Promise<EncodedImage> {
  const png = await canvasToBlob(canvas, "image/png");
  const res = await towerFetch(
    `/api/v1/images/optimize?format=${encodeURIComponent("avif")}&quality=${qualityPercent}`,
    {
      method: "POST",
      body: png,
      headers: { "Content-Type": "image/png" },
    }
  );
  await assertTowerOptimizeResponseOk(res);
  const blob = await res.blob();
  return {
    blob,
    fileName: `${baseName}.${fileExtensionForFormat("avif")}`,
    mimeType: blob.type || mimeTypeForFormat("avif"),
  };
}

export async function encodeCanvasToOptimizedFile(
  canvas: HTMLCanvasElement,
  quality: number,
  options?: { baseName?: string; format?: ImageExportFormat; avifTowerConsentGranted?: boolean }
): Promise<EncodedImage> {
  const base = sanitizeAssetBaseName(options?.baseName ?? "edited");
  const q = Math.min(1, Math.max(0.05, quality));
  const format = options?.format ?? DEFAULT_IMAGE_EXPORT_FORMAT;

  // Compliance boundary: AVIF encoding uploads the image to Codalyn Tower. No image bytes may
  // leave the Designer unless the user explicitly opted in (Marketplace privacy requirement).
  if (format === "avif" && options?.avifTowerConsentGranted !== true) {
    throw new Error(
      "AVIF conversion requires enabling it first — it sends the image to Codalyn Tower. Export WebP instead."
    );
  }
  await waitForNextPaint();

  const tower = getTowerOrigin();
  // WebP is encoded in-browser so guest mode works without Tower auth; Tower handles AVIF only (sharp).
  if (tower && format === "avif") {
    const qualityPercent = Math.min(100, Math.max(1, Math.round(q * 100)));
    return encodeAvifViaTower(canvas, qualityPercent, base);
  }

  if (format === "avif") {
    console.warn("[beacon] No Codalyn service origin in this build — AVIF conversion is disabled.");
    throw new Error("AVIF conversion isn't available in this version of Beacon. Export WebP instead.");
  }

  const blob = await canvasToBlob(canvas, "image/webp", q);
  return {
    blob,
    fileName: `${base}.${fileExtensionForFormat("webp")}`,
    mimeType: blob.type || mimeTypeForFormat("webp"),
  };
}
