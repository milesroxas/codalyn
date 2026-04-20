import type { BeaconImagePresetRow, ImageExportFormat } from "@codalyn/webflow-kit";

export type ExportPresetDefaults = {
  exportFormat: ImageExportFormat;
  exportQuality: number;
};

export function resolvePresetExportFormat(
  preset: BeaconImagePresetRow,
  defaults: ExportPresetDefaults
): ImageExportFormat {
  return preset.exportFormat ?? defaults.exportFormat;
}

export function resolvePresetExportQuality(preset: BeaconImagePresetRow, defaults: ExportPresetDefaults): number {
  return preset.exportQuality ?? defaults.exportQuality;
}

export function exportPresetMatchesSession(
  preset: BeaconImagePresetRow,
  defaults: ExportPresetDefaults,
  width: number,
  height: number,
  format: ImageExportFormat,
  quality: number,
  normalizeFormat?: (f: ImageExportFormat) => ImageExportFormat
): boolean {
  const nf = normalizeFormat ?? ((f: ImageExportFormat) => f);
  return (
    preset.width === width &&
    preset.height === height &&
    nf(resolvePresetExportFormat(preset, defaults)) === nf(format) &&
    resolvePresetExportQuality(preset, defaults) === quality
  );
}

export function findMatchingExportPresetId(
  presets: BeaconImagePresetRow[],
  defaults: ExportPresetDefaults,
  width: number,
  height: number,
  format: ImageExportFormat,
  quality: number,
  normalizeFormat?: (f: ImageExportFormat) => ImageExportFormat
): string | null {
  for (const p of presets) {
    if (exportPresetMatchesSession(p, defaults, width, height, format, quality, normalizeFormat)) {
      return p.id;
    }
  }
  return null;
}
