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
  options?: { baseName?: string }
): Promise<EncodedImage> {
  const base = sanitizeAssetBaseName(options?.baseName ?? "edited");
  const q = Math.min(1, Math.max(0.05, quality));
  await waitForNextPaint();
  const blob = await canvasToBlob(canvas, "image/webp", q);
  return {
    blob,
    fileName: `${base}.webp`,
    mimeType: blob.type || "image/webp",
  };
}
