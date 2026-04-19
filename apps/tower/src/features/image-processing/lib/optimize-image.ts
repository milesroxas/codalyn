import {
  DEFAULT_IMAGE_EXPORT_FORMAT,
  type ImageExportFormat,
  isImageExportFormat,
  mimeTypeForFormat,
} from "@codalyn/webflow-kit";
import sharp from "sharp";

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
  if (value && isImageExportFormat(value)) {
    return value;
  }
  return DEFAULT_IMAGE_EXPORT_FORMAT;
}
