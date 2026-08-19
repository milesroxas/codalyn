import type { ImageExportFormat } from "@codalyn/webflow-kit";
import type { Area } from "react-easy-crop";

import { canvasToBlob } from "@/features/image-editor/lib/canvas-to-blob";
import { renderCroppedRegionToCanvas } from "@/features/image-editor/lib/crop-image";
import { encodeCanvasToOptimizedFile } from "@/features/image-editor/lib/encode-image-blob";

export async function encodeExportPreviewPair(options: {
  imageSrc: string;
  completedCrop: Area;
  w: number;
  h: number;
  quality: number;
  exportFormat: ImageExportFormat;
  avifTowerConsentGranted?: boolean;
}): Promise<{
  originalUrl: string;
  compressedUrl: string;
  pngBlob: Blob;
  compressedBlob: Blob;
}> {
  const { imageSrc, completedCrop, w, h, quality, exportFormat, avifTowerConsentGranted } = options;
  const canvas = await renderCroppedRegionToCanvas(imageSrc, completedCrop, w, h);
  const pngBlob = await canvasToBlob(canvas, "image/png");
  const originalUrl = URL.createObjectURL(pngBlob);
  try {
    const { blob: compressedBlob } = await encodeCanvasToOptimizedFile(canvas, quality, {
      format: exportFormat,
      avifTowerConsentGranted,
    });
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
  avifTowerConsentGranted?: boolean;
}): Promise<Blob> {
  const { imageSrc, completedCrop, w, h, quality, exportFormat, avifTowerConsentGranted } = options;
  const canvas = await renderCroppedRegionToCanvas(imageSrc, completedCrop, w, h);
  const { blob } = await encodeCanvasToOptimizedFile(canvas, quality, {
    format: exportFormat,
    avifTowerConsentGranted,
  });
  return blob;
}
