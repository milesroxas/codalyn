import type { Area } from "react-easy-crop";

import { clampEdge } from "./apply-cropped-export";
import { renderCroppedRegionToCanvas } from "./crop-image";
import { encodeCanvasToOptimizedFile } from "./encode-image-blob";

export async function estimateEncodedOutputBytes(options: {
  imageSrc: string;
  completedCrop: Area;
  outputWidth: number;
  outputHeight: number;
  quality: number;
}): Promise<number> {
  const w = clampEdge(options.outputWidth);
  const h = clampEdge(options.outputHeight);
  const canvas = await renderCroppedRegionToCanvas(options.imageSrc, options.completedCrop, w, h);
  const { blob } = await encodeCanvasToOptimizedFile(canvas, options.quality);
  return blob.size;
}
