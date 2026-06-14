import { z } from "zod";

/**
 * Boundary schema for Flint's serialized rule-configuration file (the shape
 * previously private to `rule-configuration-service.ts` as `SerializedConfigFileV1`).
 *
 * IMPORTANT separation of concerns (CLAUDE.md): this file validates only the
 * persisted SHAPE. The registry-aware seeding/pruning of `customSettings`
 * (`applySchemaDefaults`) stays in the Flint app, because it needs the live
 * rule registry. Matching is always by stable rule id, never display label.
 */

export const flintSeveritySchema = z.enum(["suggestion", "warning", "error"]);
export type FlintSeverity = z.infer<typeof flintSeveritySchema>;

export const flintRuleConfigSchema = z.object({
  version: z.literal(1),
  /** Optional scoping to a preset id (stable identifier). */
  presetId: z.string().min(1).nullable().optional(),
  /** Rule ids that are enabled; absence means "fall back to registry default". */
  enabledRules: z.array(z.string().min(1)).optional(),
  /** Per-rule-id custom settings; opaque values validated against the schema in-app. */
  ruleConfigs: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
  /** Per-rule-id severity overrides (only those differing from registry default). */
  ruleSeverities: z.record(z.string(), flintSeveritySchema).optional(),
  /** ISO-8601; drives last-write-wins reconciliation. */
  lastUpdated: z.string().min(1).optional(),
});

export type FlintRuleConfig = z.infer<typeof flintRuleConfigSchema>;

export function getDefaultFlintRuleConfig(): FlintRuleConfig {
  return { version: 1, ruleConfigs: {} };
}

/** Parse an unknown value into a rule-config file; empty default on malformed shape. */
export function parseFlintRuleConfig(raw: unknown): FlintRuleConfig {
  const parsed = flintRuleConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : getDefaultFlintRuleConfig();
}

/** Parse a partial patch; drops malformed fields. */
export function parseFlintRuleConfigPartial(raw: unknown): Partial<FlintRuleConfig> {
  const parsed = flintRuleConfigSchema.partial().safeParse(raw);
  return parsed.success ? parsed.data : {};
}

/**
 * Per-rule-id overlay merge: `override` wins for any rule id it touches; everything
 * else falls through to `base`. Registry-independent (pure key overlay) — the in-app
 * loader applies registry defaults afterward. Used to apply team config over personal.
 */
export function mergeFlintRuleConfig(
  base: FlintRuleConfig,
  override: FlintRuleConfig | null | undefined
): FlintRuleConfig {
  if (!override) {
    return base;
  }

  const enabledRules =
    override.enabledRules !== undefined
      ? Array.from(new Set([...(base.enabledRules ?? []), ...override.enabledRules]))
      : base.enabledRules;

  const ruleConfigs: Record<string, Record<string, unknown>> = { ...base.ruleConfigs };
  for (const [ruleId, cfg] of Object.entries(override.ruleConfigs ?? {})) {
    ruleConfigs[ruleId] = { ...(base.ruleConfigs[ruleId] ?? {}), ...cfg };
  }

  const ruleSeverities: Record<string, FlintSeverity> | undefined =
    base.ruleSeverities || override.ruleSeverities
      ? { ...(base.ruleSeverities ?? {}), ...(override.ruleSeverities ?? {}) }
      : undefined;

  return {
    version: 1,
    presetId: override.presetId ?? base.presetId,
    ...(enabledRules !== undefined ? { enabledRules } : {}),
    ruleConfigs,
    ...(ruleSeverities ? { ruleSeverities } : {}),
    lastUpdated: override.lastUpdated ?? base.lastUpdated,
  };
}
