// features/linter/services/rule-configuration-service.ts
import type { Rule, RuleConfigSchema, RuleConfiguration, Severity } from "@/features/linter/model/rule.types";
import {
  createLocalStorageAdapter,
  DEFAULT_RULE_CONFIG_STORAGE_KEY,
  type StorageAdapter,
} from "@/features/linter/services/storage/local-storage-adapter";
import { stableStringify } from "@/shared/lib";

/* ---------- Minimal registry interface (structural typing) ---------- */
type RuleRegistryLike = {
  getAllRules(): ReadonlyArray<Rule>;
};

/* ---------- Storage adapters ---------- */
export type { StorageAdapter } from "@/features/linter/services/storage/local-storage-adapter";

/* ---------- File format (v1) ---------- */
type SerializedConfigFileV1 = {
  version: 1;
  /** Optional scoping to a preset without making it mandatory */
  presetId?: string | null;
  enabledRules?: string[];
  ruleConfigs: Record<string, Record<string, unknown>>;
  /**
   * Per-rule severity overrides. Only rules whose severity differs from the
   * registry default are stored, so changing a rule's default in code still
   * propagates to non-overridden rules (single source of truth = the default).
   */
  ruleSeverities?: Record<string, Severity>;
  lastUpdated?: string;
};

// Backward compatible union for old files without a version field
type SerializedConfigFile =
  | SerializedConfigFileV1
  | {
      // v0 legacy shape (no version)
      enabledRules?: string[];
      ruleConfigs: Record<string, Record<string, unknown>>;
      ruleSeverities?: Record<string, Severity>;
      lastUpdated?: string;
      presetId?: string | null;
    };

/* ---------- Options and service shape ---------- */
export type RuleConfigurationService = ReturnType<typeof createRuleConfigurationService>;

export type RuleConfigurationServiceOptions = {
  storage?: StorageAdapter;
  storageKey?: string;
  /** Optional scoping. Kept in the file for multi-preset workflows. */
  presetId?: string | null;
  /** Testability point for timestamps */
  nowISO?: () => string;
  /** Log hook (development only) */
  log?: (msg: string, data?: unknown) => void;
};

/* ---------- Helpers: schema seeding, validation, and pruning ---------- */

/** Returns true when `value` satisfies the declared schema field type. */
function isValidFieldValue(
  field: { type: RuleConfigSchema[string]["type"]; options?: string[] },
  value: unknown
): boolean {
  switch (field.type) {
    case "string":
      return typeof value === "string";
    case "string[]":
      return Array.isArray(value) && value.every((v) => typeof v === "string");
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "enum":
      return typeof value === "string" && Array.isArray(field.options) && field.options.includes(value);
    default:
      return false;
  }
}

/**
 * Seed effective custom settings from the schema:
 * - keep a stored value only when it is present AND valid for the field type
 * - otherwise fall back to the field default
 * - prune any unknown keys not declared in the schema
 *
 * Malformed values (wrong type, out-of-range enum) never reach rules.
 */
function applySchemaDefaults(
  schema: RuleConfigSchema | undefined,
  stored: Readonly<Record<string, unknown>> | undefined
): Record<string, unknown> {
  if (!schema) {
    // No schema means leave user settings as-is
    return { ...(stored ?? {}) };
  }
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema)) {
    const hasStored = !!stored && key in stored;
    out[key] = hasStored && isValidFieldValue(field, stored[key]) ? stored[key] : field.default;
  }
  // prune any unknown keys that were stored previously
  return out;
}

const SEVERITIES: ReadonlySet<Severity> = new Set<Severity>(["suggestion", "warning", "error"]);

function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && SEVERITIES.has(value as Severity);
}

/** Keep only well-formed severity entries from a stored/imported map. */
function sanitizeSeverityMap(raw: Record<string, unknown> | undefined): Record<string, Severity> {
  const out: Record<string, Severity> = {};
  if (!raw) return out;
  for (const [ruleId, value] of Object.entries(raw)) {
    if (isSeverity(value)) out[ruleId] = value;
  }
  return out;
}

function isV1(file: SerializedConfigFile): file is SerializedConfigFileV1 {
  return (file as SerializedConfigFileV1).version === 1;
}

/* ---------- Factory ---------- */
export const createRuleConfigurationService = (
  ruleRegistry: RuleRegistryLike,
  opts: RuleConfigurationServiceOptions = {}
) => {
  const storageKey = opts.storageKey ?? DEFAULT_RULE_CONFIG_STORAGE_KEY;
  const storage = opts.storage ?? createLocalStorageAdapter(storageKey);
  const nowISO = opts.nowISO ?? (() => new Date().toISOString());
  const log = opts.log ?? (() => {});

  /* ----- Core read/write ----- */
  const readFile = (): SerializedConfigFile => {
    try {
      const raw = storage.read();
      if (!raw) return { ruleConfigs: {} };
      const parsed = JSON.parse(raw) as SerializedConfigFile;
      // Accept v0 silently; upgrade to v1 in memory
      if (isV1(parsed)) return parsed;
      return {
        version: 1,
        enabledRules: parsed.enabledRules ?? [],
        ruleConfigs: parsed.ruleConfigs ?? {},
        ruleSeverities: parsed.ruleSeverities,
        lastUpdated: parsed.lastUpdated,
        presetId: parsed.presetId ?? null,
      };
    } catch (err) {
      log("Malformed stored config. Falling back to defaults.", err);
      return { ruleConfigs: {} };
    }
  };

  const writeFile = (file: SerializedConfigFileV1) => {
    try {
      storage.write(stableStringify(file));
      log("Saved linter config", file);
    } catch (err) {
      log("Failed to save linter config", err);
    }
  };

  /* ----- Public API ----- */

  /**
   * Build effective configs by merging storage with registry defaults
   * and seeding/pruning via config schema.
   */
  const load = (): RuleConfiguration[] => {
    const file = readFile();
    const enabledSet = new Set(file.enabledRules ?? []);
    const severityOverrides = sanitizeSeverityMap(file.ruleSeverities);
    const rules = ruleRegistry.getAllRules();

    return rules.map((rule) => {
      // Enabled logic:
      // - If file lists enabledRules, respect explicit presence
      // - If rule has no stored block yet, default to rule.enabled
      // - If rule is absent from enabledRules but has a stored block, keep disabled
      const hasStored = rule.id in file.ruleConfigs;
      const enabled = file.enabledRules ? (enabledSet.has(rule.id) || !hasStored ? rule.enabled : false) : rule.enabled;

      const storedSettings = file.ruleConfigs[rule.id];
      const customSettings = applySchemaDefaults((rule as Rule & { config?: RuleConfigSchema }).config, storedSettings);

      return {
        ruleId: rule.id,
        enabled,
        // Effective severity = stored override ?? registry default.
        severity: severityOverrides[rule.id] ?? rule.severity,
        customSettings,
      };
    });
  };

  /**
   * Persisted severity overrides only (validated). Used at init to apply user
   * severity on top of preset/opinion-mode policy without clobbering it.
   */
  const getStoredSeverities = (): Record<string, Severity> => sanitizeSeverityMap(readFile().ruleSeverities);

  /**
   * Build the serialized file from a set of configs. Single source for both
   * persistence (save) and export, so the on-disk shape never diverges.
   * Only severities that differ from the registry default are stored.
   */
  const buildSerializedFile = (
    configs: ReadonlyArray<RuleConfiguration>,
    presetId: string | null
  ): SerializedConfigFileV1 => {
    const defaultSeverityById = new Map(ruleRegistry.getAllRules().map((r) => [r.id, r.severity]));
    const ruleSeverities: Record<string, Severity> = {};
    for (const cfg of configs) {
      const def = defaultSeverityById.get(cfg.ruleId);
      if (def !== undefined && cfg.severity !== def) ruleSeverities[cfg.ruleId] = cfg.severity;
    }

    return {
      version: 1,
      presetId,
      enabledRules: configs.filter((c) => c.enabled).map((c) => c.ruleId),
      ruleConfigs: configs.reduce<Record<string, Record<string, unknown>>>((acc, cfg) => {
        acc[cfg.ruleId] = { ...cfg.customSettings };
        return acc;
      }, {}),
      ...(Object.keys(ruleSeverities).length > 0 ? { ruleSeverities } : {}),
      lastUpdated: nowISO(),
    };
  };

  /**
   * Persist a full set of configs. Keeps format stable and compatible.
   */
  const save = (configs: ReadonlyArray<RuleConfiguration>, presetId: string | null = opts.presetId ?? null): void => {
    writeFile(buildSerializedFile(configs, presetId));
  };

  /**
   * Export a set of configs to a JSON string.
   */
  const exportConfiguration = (
    configs: ReadonlyArray<RuleConfiguration>,
    presetId: string | null = opts.presetId ?? null
  ): string => stableStringify(buildSerializedFile(configs, presetId));

  /**
   * Import from JSON and return the effective merged array.
   * Does not auto-save, so caller can preview or validate before persisting.
   */
  const importConfiguration = (json: string): RuleConfiguration[] => {
    let incoming: SerializedConfigFile;
    try {
      incoming = JSON.parse(json) as SerializedConfigFile;
      if (!incoming || typeof incoming !== "object") {
        throw new Error("Invalid payload");
      }
      if (!("ruleConfigs" in incoming) || typeof incoming.ruleConfigs !== "object") {
        throw new Error("Missing ruleConfigs");
      }
    } catch (_err) {
      throw new Error("Invalid configuration file");
    }

    const base = load();
    const enabledSet = new Set(incoming.enabledRules ?? []);
    const severityOverrides = sanitizeSeverityMap(incoming.ruleSeverities);

    return base.map((cfg) => {
      const next: RuleConfiguration = { ...cfg };
      if (incoming.enabledRules) next.enabled = enabledSet.has(cfg.ruleId);
      if (cfg.ruleId in severityOverrides) next.severity = severityOverrides[cfg.ruleId];
      if (incoming.ruleConfigs[cfg.ruleId]) {
        // Re-apply schema to imported values as well
        const rule = ruleRegistry.getAllRules().find((r) => r.id === cfg.ruleId);
        const schema = rule && (rule as Rule & { config?: RuleConfigSchema }).config;
        next.customSettings = applySchemaDefaults(schema, incoming.ruleConfigs[cfg.ruleId]);
      }
      return next;
    });
  };

  /**
   * Reset to registry defaults and persist.
   */
  const resetToDefaults = (presetId: string | null = opts.presetId ?? null): RuleConfiguration[] => {
    const defaults = ruleRegistry.getAllRules().map<RuleConfiguration>((rule) => {
      const schema = (rule as Rule & { config?: RuleConfigSchema }).config;
      return {
        ruleId: rule.id,
        enabled: rule.enabled,
        severity: rule.severity,
        customSettings: applySchemaDefaults(schema, undefined),
      };
    });
    save(defaults, presetId);
    return defaults;
  };

  /**
   * Convenience helpers for single-rule edits. Both persist immediately.
   */
  const upsertRuleCustomSettings = (ruleId: string, partial: Record<string, unknown>): RuleConfiguration[] => {
    const current = load();
    const next = current.map((cfg) => {
      if (cfg.ruleId !== ruleId) return cfg;
      const rule = ruleRegistry.getAllRules().find((r) => r.id === ruleId);
      const schema = rule && (rule as Rule & { config?: RuleConfigSchema }).config;
      const merged = { ...cfg.customSettings, ...partial };
      return { ...cfg, customSettings: applySchemaDefaults(schema, merged) };
    });
    save(next);
    return next;
  };

  const setRuleEnabled = (ruleId: string, enabled: boolean): RuleConfiguration[] => {
    const current = load();
    const next = current.map((c) => (c.ruleId === ruleId ? { ...c, enabled } : c));
    save(next);
    return next;
  };

  return {
    load,
    getStoredSeverities,
    save,
    exportConfiguration,
    importConfiguration,
    resetToDefaults,
    upsertRuleCustomSettings,
    setRuleEnabled,
  };
};
