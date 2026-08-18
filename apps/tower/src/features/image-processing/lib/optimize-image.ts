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
  /** Sharp-detected container format (e.g. "png"); always one of {@link ALLOWED_SOURCE_IMAGE_FORMATS}. */
  format: string;
};

/**
 * Raster containers the optimizer accepts as input. Beacon uploads canvas PNG exports; the other raster
 * formats are harmless equivalents. Everything else — notably SVG (librsvg) and PDF (poppler) — is
 * refused *before* any decode so those libvips loaders are never reachable from user input.
 */
export const ALLOWED_SOURCE_IMAGE_FORMATS = new Set(["png", "jpeg", "jpg", "webp", "avif", "gif", "tiff", "heif"]);

export function isAllowedSourceImageFormat(format: string | null | undefined): format is string {
  return typeof format === "string" && ALLOWED_SOURCE_IMAGE_FORMATS.has(format.toLowerCase());
}

/**
 * Reads decoded image dimensions cheaply (header parse, no full decode) so credits can be calculated
 * before metering. Returns null when the buffer is not a recognized image, is not an allowlisted raster
 * format, or has missing/invalid dimensions — callers treat null as an unusable image (400), never 500.
 */
export async function readSourceImageMetadata(input: Buffer): Promise<SourceImageMetadata | null> {
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input).metadata();
  } catch {
    // Non-image / unsupported / truncated header: sharp throws ("Input buffer contains unsupported image format").
    return null;
  }
  const format = meta.format ?? null;
  if (!isAllowedSourceImageFormat(format)) {
    return null;
  }
  const { width, height } = meta;
  if (typeof width !== "number" || typeof height !== "number" || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height, format: format.toLowerCase() };
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
