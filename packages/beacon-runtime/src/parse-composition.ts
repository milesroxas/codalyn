import type { BeaconBlock, BeaconComposition } from "./types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceOverrides(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") out[k] = v;
    else if (typeof v === "number" || typeof v === "boolean") out[k] = String(v);
  }
  return out;
}

function coerceBlock(raw: unknown): BeaconBlock | null {
  if (!isRecord(raw)) return null;
  const componentId = typeof raw.componentId === "string" ? raw.componentId : null;
  if (!componentId) return null;
  const id = typeof raw.id === "string" && raw.id.length > 0 ? raw.id : componentId;
  return { id, componentId, overrides: coerceOverrides(raw.overrides) };
}

export function parseComposition(raw: string | null | undefined): BeaconComposition {
  const empty: BeaconComposition = { v: 1, slots: {} };
  if (!raw) return empty;
  const trimmed = raw.trim();
  if (!trimmed) return empty;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return empty;
  }
  if (!isRecord(parsed)) return empty;

  const slots: Record<string, BeaconBlock[]> = {};
  const rawSlots = isRecord(parsed.slots) ? parsed.slots : null;
  if (rawSlots) {
    for (const [name, list] of Object.entries(rawSlots)) {
      if (!Array.isArray(list)) continue;
      const blocks = list.map(coerceBlock).filter((b): b is BeaconBlock => b !== null);
      if (blocks.length > 0) slots[name] = blocks;
    }
  }

  return { v: 1, slots };
}
