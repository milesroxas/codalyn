import {
  DEFAULT_IMAGE_EXPORT_FORMAT,
  type ImageExportFormat,
  isImageExportFormat,
  mimeTypeForFormat,
} from "@codalyn/webflow-kit";
import sharp from "sharp";

/**
 * Hard per-edge safety cap. Anything larger is rejected before encoding to protect the optimizer
 * (matches the Beacon preset edge ceiling). Independent of customer caps/credits.
 */
export const IMAGE_OPTIMIZE_MAX_OUTPUT_EDGE = 8192;

export type SourceImageMetadata = {
  width: number;
  height: number;
  /** Sharp-detected container format (e.g. "png"), or null when unknown. */
  format: string | null;
};

/**
 * Reads decoded image dimensions cheaply (header parse, no full decode) so credits can be calculated
 * before metering. Returns null when dimensions are missing/invalid (treated as an unusable image).
 */
export async function readSourceImageMetadata(input: Buffer): Promise<SourceImageMetadata | null> {
  const meta = await sharp(input).metadata();
  const { width, height } = meta;
  if (typeof width !== "number" || typeof height !== "number" || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height, format: meta.format ?? null };
}

export async function optimizeImageBuffer(
  input: Buffer,
  format: ImageExportFormat = DEFAULT_IMAGE_EXPORT_FORMAT,
  quality = 80
): Promise<{ buffer: Buffer; mimeType: string }> {
  const pipeline = sharp(input);
  const q = Math.min(100, Math.max(1, Math.round(quality)));
  const buffer =
    format === "avif" ? await pipeline.avif({ quality: q }).toBuffer() : await pipeline.webp({ quality: q }).toBuffer();
  return { buffer, mimeType: mimeTypeForFormat(format) };
}

export function parseImageFormatParam(value: string | null): ImageExportFormat {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized && isImageExportFormat(normalized)) {
    return normalized;
  }
  return DEFAULT_IMAGE_EXPORT_FORMAT;
}
