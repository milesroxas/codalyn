import { z } from "zod";

import { flintRuleConfigSchema } from "./flint-rule-config.js";

/**
 * User/team-defined custom linter presets. A custom preset extends a built-in
 * base grammar (`baseId`, e.g. `lumos` or `client-first`) and layers a
 * rule-config overlay on top. Matching is by stable `id`, never by `name`.
 */

export const flintCustomPresetSchema = z.object({
  /** Stable identifier (slug); never a display label. */
  id: z.string().min(1),
  name: z.string().min(1),
  /** Built-in grammar this preset derives from (stable id). */
  baseId: z.string().min(1),
  /** Optional rule-config overlay applied on top of the base preset's defaults. */
  ruleConfig: flintRuleConfigSchema.optional(),
  lastUpdated: z.string().min(1).optional(),
});

export type FlintCustomPreset = z.infer<typeof flintCustomPresetSchema>;

export const flintCustomPresetsSchema = z.array(flintCustomPresetSchema).default([]);
export type FlintCustomPresets = z.infer<typeof flintCustomPresetsSchema>;

export function getDefaultFlintCustomPresets(): FlintCustomPresets {
  return [];
}

/** Deduplicate by stable `id`; last occurrence wins (so overlays/imports can override). */
export function dedupeFlintCustomPresets(presets: FlintCustomPresets): FlintCustomPresets {
  const byId = new Map<string, FlintCustomPreset>();
  for (const preset of presets) {
    byId.set(preset.id, preset);
  }
  return Array.from(byId.values());
}

/** Parse an unknown value into a deduped custom-preset list; empty on malformed shape. */
export function parseFlintCustomPresets(raw: unknown): FlintCustomPresets {
  const parsed = flintCustomPresetsSchema.safeParse(raw);
  return parsed.success ? dedupeFlintCustomPresets(parsed.data) : getDefaultFlintCustomPresets();
}

/**
 * Merge team-shared presets over personal ones: team entries override personal
 * entries sharing the same id; remaining personal entries are preserved.
 */
export function mergeFlintCustomPresets(
  personal: FlintCustomPresets,
  team: FlintCustomPresets | null | undefined
): FlintCustomPresets {
  if (!team || team.length === 0) {
    return dedupeFlintCustomPresets(personal);
  }
  // dedupe keeps last-wins, so team entries placed after personal override by id.
  return dedupeFlintCustomPresets([...personal, ...team]);
}
