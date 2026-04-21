import {
  BEACON_PRESET_DEFAULT_MAX_FILE_BYTES,
  BEACON_PRESET_MAX_FILE_BYTES_MAX,
  BEACON_PRESET_MAX_FILE_BYTES_MIN,
} from "@codalyn/webflow-kit";

const MAX_EDGE = 8192;
const MIN_EDGE = 1;

function clampEdge(n: number): number {
  if (Number.isNaN(n)) {
    return MIN_EDGE;
  }
  return Math.min(MAX_EDGE, Math.max(MIN_EDGE, Math.round(n)));
}

/** Resolves width/height from preset inputs; empty or invalid uses fallback (matches Beacon editor). */
export function parsePresetOutputDimension(input: string, fallback: number): number {
  const n = Number(input);
  if (input.trim() === "" || Number.isNaN(n)) {
    return clampEdge(fallback);
  }
  return clampEdge(n);
}

export type MaxSizeUnit = "kb" | "mb";

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
