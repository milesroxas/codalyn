import {
  DEFAULT_IMAGE_EXPORT_FORMAT,
  fileExtensionForFormat,
  type ImageExportFormat,
  mimeTypeForFormat,
} from "@codalyn/webflow-kit";
import { sanitizeAssetBaseName } from "@/features/image-editor/lib/sanitize-asset-base-name";
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

  if (format === "webp") {
    const blob = await canvasToBlob(canvas, "image/webp", q);
    return {
      blob,
      fileName: `${base}.${fileExtensionForFormat("webp")}`,
      mimeType: blob.type || mimeTypeForFormat("webp"),
    };
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas has no 2D context");
  }
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { default: encodeAvif } = await import("@jsquash/avif/encode");
  const ab = await encodeAvif(imageData, { quality: Math.round(q * 100) });
  const blob = new Blob([ab], { type: mimeTypeForFormat("avif") });
  return {
    blob,
    fileName: `${base}.${fileExtensionForFormat("avif")}`,
    mimeType: mimeTypeForFormat("avif"),
  };
}
