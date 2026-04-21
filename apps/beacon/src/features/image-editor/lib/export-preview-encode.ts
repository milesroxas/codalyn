import type { ImageExportFormat } from "@codalyn/webflow-kit";
import type { Area } from "react-easy-crop";

import { renderCroppedRegionToCanvas } from "@/features/image-editor/lib/crop-image";
import { encodeCanvasToOptimizedFile } from "@/features/image-editor/lib/encode-image-blob";

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("PNG preview encoding produced no blob"));
      }
    }, "image/png");
  });
}

export async function encodeExportPreviewPair(options: {
  imageSrc: string;
  completedCrop: Area;
  w: number;
  h: number;
  quality: number;
  exportFormat: ImageExportFormat;
}): Promise<{
  originalUrl: string;
  compressedUrl: string;
  pngBlob: Blob;
  compressedBlob: Blob;
}> {
  const { imageSrc, completedCrop, w, h, quality, exportFormat } = options;
  const canvas = await renderCroppedRegionToCanvas(imageSrc, completedCrop, w, h);
  const pngBlob = await canvasToPngBlob(canvas);
  const originalUrl = URL.createObjectURL(pngBlob);
  try {
    const { blob: compressedBlob } = await encodeCanvasToOptimizedFile(canvas, quality, { format: exportFormat });
    const compressedUrl = URL.createObjectURL(compressedBlob);
    return { originalUrl, compressedUrl, pngBlob, compressedBlob };
  } catch (err) {
    URL.revokeObjectURL(originalUrl);
    throw err;
  }
}

/** Lossy export only (same pipeline as full export). */
export async function encodeExportCompressedPreviewBlob(options: {
  imageSrc: string;
  completedCrop: Area;
  w: number;
  h: number;
  quality: number;
  exportFormat: ImageExportFormat;
}): Promise<Blob> {
  const { imageSrc, completedCrop, w, h, quality, exportFormat } = options;
  const canvas = await renderCroppedRegionToCanvas(imageSrc, completedCrop, w, h);
  const { blob } = await encodeCanvasToOptimizedFile(canvas, quality, { format: exportFormat });
  return blob;
}
