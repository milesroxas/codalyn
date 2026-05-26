/**
 * Default export format for Designer extension bundles and CMS uploads.
 * WebP stays the default (encoded in the extension); AVIF is typically produced server-side (e.g. Tower).
 */
export const DEFAULT_IMAGE_EXPORT_FORMAT = "webp" as const;

/** Supported optimized outputs (Tower may also produce these server-side). */
export const IMAGE_EXPORT_FORMATS = ["webp", "avif"] as const;

export type ImageExportFormat = (typeof IMAGE_EXPORT_FORMATS)[number];

export const IMAGE_EXPORT_FORMAT_OPTIONS: ReadonlyArray<{
  value: ImageExportFormat;
  label: string;
}> = [
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF" },
];

export function isImageExportFormat(value: string): value is ImageExportFormat {
  return (IMAGE_EXPORT_FORMATS as readonly string[]).includes(value);
}

export function fileExtensionForFormat(format: ImageExportFormat): string {
  return format === "avif" ? "avif" : "webp";
}

export function mimeTypeForFormat(format: ImageExportFormat): string {
  return format === "avif" ? "image/avif" : "image/webp";
}
