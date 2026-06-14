import { z } from "zod";

/**
 * Personal Flint app settings — the normalized, Tower-syncable shape that unifies
 * the previously scattered browser keys (`flint.linter.settings.v1`,
 * `flowlint.activePresetId`, `flowlint-ui-theme`) into a single payload.
 *
 * Rule configuration and custom presets are persisted separately (their own
 * columns / schemas) because they merge differently (per-rule-id overlay) and
 * are team-shareable; see `flint-rule-config.ts` and `flint-custom-presets.ts`.
 */

export const flintThemePreferenceSchema = z.enum(["light", "dark", "system"]);
export type FlintThemePreference = z.infer<typeof flintThemePreferenceSchema>;

export const flintWindowPresetSchema = z.enum(["large", "medium", "compact"]);
export type FlintWindowPreset = z.infer<typeof flintWindowPresetSchema>;

/** Ignore-class entries are arbitrary class names / glob-ish tokens; trimmed, non-empty. */
const ignoredClassListSchema = z.array(z.string().min(1)).default([]);

export const flintAppSettingsSchema = z.object({
  version: z.literal(1),
  theme: flintThemePreferenceSchema.default("system"),
  autoSelectElement: z.boolean().default(true),
  ignoreThirdPartyClasses: z.boolean().default(true),
  windowPreset: flintWindowPresetSchema.default("compact"),
  globalIgnoredClasses: ignoredClassListSchema,
  /** Per-preset ignore lists keyed by stable preset id (e.g. `lumos`, `client-first`). */
  presetIgnoredClasses: z.record(z.string(), ignoredClassListSchema).default({}),
  /** Last selected preset id; stable identifier, never a display label. */
  activePresetId: z.string().min(1).nullable().default(null),
  /** ISO-8601; drives last-write-wins reconciliation against Tower. */
  lastUpdated: z.string().min(1).optional(),
});

export type FlintAppSettings = z.infer<typeof flintAppSettingsSchema>;

export function getDefaultFlintAppSettings(): FlintAppSettings {
  return {
    version: 1,
    theme: "system",
    autoSelectElement: true,
    ignoreThirdPartyClasses: true,
    windowPreset: "compact",
    globalIgnoredClasses: [],
    presetIgnoredClasses: {},
    activePresetId: null,
  };
}

/** Parse an unknown (Tower/localStorage) value into full settings; defaults on any malformed shape. */
export function parseFlintAppSettings(raw: unknown): FlintAppSettings {
  const parsed = flintAppSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : getDefaultFlintAppSettings();
}

/** Parse a partial patch; drops unknown/malformed fields rather than throwing. */
export function parseFlintAppSettingsPartial(raw: unknown): Partial<FlintAppSettings> {
  const parsed = flintAppSettingsSchema.partial().safeParse(raw);
  return parsed.success ? parsed.data : {};
}

/** `patch` wins per-field; arrays/records replaced when provided (not deep-merged). */
export function mergeFlintAppSettings(base: FlintAppSettings, patch: Partial<FlintAppSettings>): FlintAppSettings {
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  ) as Partial<FlintAppSettings>;
  return parseFlintAppSettings({ ...base, ...clean });
}
