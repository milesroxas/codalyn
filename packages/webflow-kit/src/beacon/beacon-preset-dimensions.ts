import type { ImageExportFormat } from "../image/output-formats.js";
import {
  BEACON_PRESET_DEFAULT_MAX_FILE_BYTES,
  BEACON_PRESET_MAX_FILE_BYTES_MAX,
  BEACON_PRESET_MAX_FILE_BYTES_MIN,
} from "./beacon-app-settings.js";
import type { BeaconPresetRow } from "./beacon-image-preset-domain.js";

const PRESET_EDGE_MAX = 8192;
const PRESET_EDGE_MIN = 1;

function clampPresetEdge(n: number): number {
  if (Number.isNaN(n)) {
    return PRESET_EDGE_MIN;
  }
  return Math.min(PRESET_EDGE_MAX, Math.max(PRESET_EDGE_MIN, Math.round(n)));
}

/** Resolves width/height from preset inputs; empty or invalid uses fallback (matches Beacon editor). */
export function parsePresetOutputDimension(input: string, fallback: number): number {
  const n = Number(input);
  if (input.trim() === "" || Number.isNaN(n)) {
    return clampPresetEdge(fallback);
  }
  return clampPresetEdge(n);
}

export type MaxSizeUnit = "kb" | "mb";

export const MAX_SIZE_UNIT_OPTIONS: ReadonlyArray<{
  value: MaxSizeUnit;
  label: string;
}> = [
  { value: "kb", label: "KB" },
  { value: "mb", label: "MB" },
];

export function isMaxSizeUnit(value: string): value is MaxSizeUnit {
  return value === "kb" || value === "mb";
}

export function draftToMaxBytes(value: string, unit: MaxSizeUnit): number {
  const n = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) {
    return BEACON_PRESET_DEFAULT_MAX_FILE_BYTES;
  }
  const raw = unit === "mb" ? n * 1024 * 1024 : n * 1024;
  return Math.min(BEACON_PRESET_MAX_FILE_BYTES_MAX, Math.max(BEACON_PRESET_MAX_FILE_BYTES_MIN, Math.round(raw)));
}

export function maxBytesToDraft(bytes: number): { value: string; unit: MaxSizeUnit } {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    const rounded = Math.round(mb * 10) / 10;
    return { value: Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1), unit: "mb" };
  }
  return { value: String(Math.max(1, Math.round(bytes / 1024))), unit: "kb" };
}

export function formatBeaconPresetMax(bytes: number): string {
  const b = Math.min(BEACON_PRESET_MAX_FILE_BYTES_MAX, Math.max(BEACON_PRESET_MAX_FILE_BYTES_MIN, Math.round(bytes)));
  if (b >= 1024 * 1024) {
    const mb = b / (1024 * 1024);
    return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(b / 1024))} KB`;
}

export function formatBeaconPresetDimensionsLabel(row: Pick<BeaconPresetRow, "width" | "height">): string {
  return `${row.width}×${row.height}px`;
}

export function formatBeaconPresetExportSummary(
  row: Pick<BeaconPresetRow, "width" | "height" | "exportFormat">,
  defaultExportFormat?: ImageExportFormat
): string {
  const base = formatBeaconPresetDimensionsLabel(row);
  const format = row.exportFormat ?? defaultExportFormat;
  return format ? `${base} · ${format}` : base;
}

export function formatBeaconPresetStorageSummary(
  row: Pick<BeaconPresetRow, "width" | "height" | "exportFormat" | "maxFileSizeBytes">,
  defaultExportFormat?: ImageExportFormat
): string {
  return `${formatBeaconPresetExportSummary(row, defaultExportFormat)} · max ${formatBeaconPresetMax(row.maxFileSizeBytes)}`;
}
