import {
  DEFAULT_IMAGE_EXPORT_FORMAT,
  fileExtensionForFormat,
  type ImageExportFormat,
  mimeTypeForFormat,
} from "@codalyn/webflow-kit";
import { sanitizeAssetBaseName } from "@/features/image-editor/lib/sanitize-asset-base-name";
import { getTowerOrigin, towerFetch } from "@/shared/lib/tower-client";
import { waitForNextPaint } from "@/shared/lib/wait-for-next-paint";

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Encoding produced no blob"));
        }
      },
      type,
      quality
    );
  });
}

export type EncodedImage = {
  blob: Blob;
  fileName: string;
  mimeType: string;
};

export async function encodeCanvasToOptimizedFile(
  canvas: HTMLCanvasElement,
  quality: number,
  options?: { baseName?: string; format?: ImageExportFormat }
): Promise<EncodedImage> {
  const base = sanitizeAssetBaseName(options?.baseName ?? "edited");
  const q = Math.min(1, Math.max(0.05, quality));
  const format = options?.format ?? DEFAULT_IMAGE_EXPORT_FORMAT;
  await waitForNextPaint();

  const tower = getTowerOrigin();
  if (tower) {
    const qualityPercent = Math.min(100, Math.max(1, Math.round(q * 100)));
    const png = await canvasToBlob(canvas, "image/png");
    const res = await towerFetch(
      `/api/v1/images/optimize?format=${encodeURIComponent(format)}&quality=${qualityPercent}`,
      {
        method: "POST",
        body: png,
        headers: { "Content-Type": "image/png" },
      }
    );

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 240);
      if (res.status === 401) {
        throw new Error(
          "Tower rejected the request (401). Set VITE_BEACON_API_KEY to match Tower BEACON_API_KEY, or use a session that can call /api/v1."
        );
      }
      throw new Error(`Tower image optimize failed (${res.status}): ${detail || res.statusText}`);
    }

    const blob = await res.blob();
    return {
      blob,
      fileName: `${base}.${fileExtensionForFormat(format)}`,
      mimeType: blob.type || mimeTypeForFormat(format),
    };
  }

  if (format === "avif") {
    throw new Error("AVIF needs Tower: set VITE_TOWER_ORIGIN (and VITE_BEACON_API_KEY if Tower uses BEACON_API_KEY).");
  }

  const blob = await canvasToBlob(canvas, "image/webp", q);
  return {
    blob,
    fileName: `${base}.${fileExtensionForFormat("webp")}`,
    mimeType: blob.type || mimeTypeForFormat("webp"),
  };
}
