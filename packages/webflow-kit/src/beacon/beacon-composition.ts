import { z } from "zod";

export const BEACON_COMPOSITION_VERSION = 1 as const;

export const BEACON_BANK_CAP = 5 as const;
export const BEACON_COMPOSITION_CAP = 10 as const;

export const beaconFieldTypeSchema = z.enum(["text", "html", "image-src", "href"]);
export type BeaconFieldType = z.infer<typeof beaconFieldTypeSchema>;

export const beaconBlockSchema = z.object({
  id: z.string().min(1),
  componentId: z.string().min(1),
  overrides: z.record(z.string()).default({}),
});
export type BeaconBlock = z.infer<typeof beaconBlockSchema>;

export const beaconCompositionSchema = z.object({
  v: z.literal(BEACON_COMPOSITION_VERSION),
  slots: z.record(z.array(beaconBlockSchema)),
});
export type BeaconComposition = z.infer<typeof beaconCompositionSchema>;

export const beaconFieldConfigSchema = z.object({
  key: z.string().min(1),
  type: beaconFieldTypeSchema,
  label: z.string().optional(),
});
export type BeaconFieldConfig = z.infer<typeof beaconFieldConfigSchema>;

/** Picked Webflow string-like component props; override keys in composition JSON = `propId`. */
export const beaconExposedStringPropSchema = z.object({
  propId: z.string().min(1),
  name: z.string().min(1),
});
export type BeaconExposedStringProp = z.infer<typeof beaconExposedStringPropSchema>;

const legacyAllowlistEntry = z
  .object({
    componentId: z.string().min(1),
    label: z.string().default(""),
    /** @deprecated */
    fields: z.array(beaconFieldConfigSchema).default([]),
    exposedStringProps: z.array(beaconExposedStringPropSchema).default([]).optional(),
  })
  .transform((row): { componentId: string; label: string; exposedStringProps: BeaconExposedStringProp[] } => ({
    componentId: row.componentId,
    label: row.label,
    exposedStringProps: row.exposedStringProps?.length
      ? row.exposedStringProps
      : row.fields.length > 0
        ? row.fields.map((f) => ({ propId: f.key, name: f.label ?? f.key }))
        : [],
  }));

export const beaconAllowlistEntrySchema = legacyAllowlistEntry;
export type BeaconAllowlistEntry = z.output<typeof legacyAllowlistEntry>;

export const beaconBankConfigSchema = z.object({
  v: z.literal(1),
  targetCollectionId: z.string().min(1),
  allowlist: z.array(beaconAllowlistEntrySchema).max(BEACON_BANK_CAP).default([]),
  slots: z.array(z.object({ name: z.string().min(1), fieldSlug: z.string().min(1) })).default([]),
});
export type BeaconBankConfig = z.output<typeof beaconBankConfigSchema>;

export function createEmptyComposition(): BeaconComposition {
  return { v: BEACON_COMPOSITION_VERSION, slots: {} };
}

export function createEmptyBankConfig(targetCollectionId: string): BeaconBankConfig {
  return { v: 1, targetCollectionId, allowlist: [], slots: [] };
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseComposition(raw: unknown): ParseResult<BeaconComposition> {
  if (raw === null || raw === undefined || raw === "") {
    return { ok: true, value: createEmptyComposition() };
  }
  let input: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return { ok: true, value: createEmptyComposition() };
    }
    try {
      input = JSON.parse(trimmed);
    } catch {
      return { ok: false, error: "Composition field contains invalid JSON." };
    }
  }
  const parsed = beaconCompositionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Composition JSON does not match the expected schema." };
  }
  return { ok: true, value: parsed.data };
}

export function serializeComposition(c: BeaconComposition): string {
  return JSON.stringify(c);
}

export function parseBankConfig(raw: unknown): ParseResult<BeaconBankConfig> {
  let input: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return { ok: false, error: "Bank config string is empty." };
    try {
      input = JSON.parse(trimmed);
    } catch {
      return { ok: false, error: "Bank config contains invalid JSON." };
    }
  }
  const parsed = beaconBankConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Bank config JSON does not match the expected schema." };
  }
  return { ok: true, value: parsed.data };
}

export function serializeBankConfig(c: BeaconBankConfig): string {
  return JSON.stringify(c);
}

export function isBlockCapReached(blocks: readonly BeaconBlock[]): boolean {
  return blocks.length >= BEACON_COMPOSITION_CAP;
}

export function isBankCapReached(entries: readonly BeaconAllowlistEntry[]): boolean {
  return entries.length >= BEACON_BANK_CAP;
}
