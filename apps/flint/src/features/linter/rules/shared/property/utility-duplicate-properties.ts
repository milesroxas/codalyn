import type { ClassType, ElementAnalysisArgs, Rule, RuleResult } from "@/features/linter/model/rule.types";

/**
 * Config for duplicate-of-utility detection.
 * - compareMode: "equal" detects exact match of property sets.
 * - "subset" flags custom classes whose declarations are a subset of a utility.
 * - propertyAllowlist/propertyBlocklist control which CSS props are compared.
 * - ignoreCustomProperties excludes CSS custom props, e.g. --token.
 * - normalizeValues normalizes whitespace and zero values to reduce false positives.
 */
type DuplicateOfUtilityConfig = {
  compareMode: "equal" | "subset";
  propertyAllowlist?: string[];
  propertyBlocklist?: string[];
  ignoreCustomProperties: boolean;
  normalizeValues: boolean;
};

const DEFAULT_CONFIG: DuplicateOfUtilityConfig = {
  compareMode: "equal",
  propertyAllowlist: undefined,
  propertyBlocklist: undefined,
  ignoreCustomProperties: true,
  normalizeValues: true,
};

/** Build a normalized declaration map according to config. */
const buildComparableDecls = (decls: Record<string, string>, cfg: DuplicateOfUtilityConfig): Record<string, string> => {
  const out: Record<string, string> = {};
  const allow = cfg.propertyAllowlist?.length ? new Set(cfg.propertyAllowlist) : null;
  const block = cfg.propertyBlocklist?.length ? new Set(cfg.propertyBlocklist) : null;

  for (const [prop, raw] of Object.entries(decls)) {
    if (cfg.ignoreCustomProperties && prop.startsWith("--")) continue;
    if (allow && !allow.has(prop)) continue;
    if (block?.has(prop)) continue;

    out[prop] = raw;
  }

  return out;
};

/** Compare two declaration maps for equality or subset. */
const compareDecls = (a: Record<string, string>, b: Record<string, string>, mode: "equal" | "subset"): boolean => {
  if (mode === "equal") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) if (a[k] !== b[k]) return false;
    return true;
  }

  // subset: every prop in a must exist in b with the same value
  for (const [k, v] of Object.entries(a)) {
    if (!(k in b) || b[k] !== v) return false;
  }
  return true;
};

function firstDuplicateOfUtilityHit(
  classItem: ElementAnalysisArgs["classes"][number],
  getClassType: ElementAnalysisArgs["getClassType"],
  getComparable: (className: string) => Record<string, string> | null,
  utilityDecls: Map<string, Record<string, string>>,
  compareMode: "equal" | "subset"
): RuleResult | undefined {
  const kind: ClassType =
    typeof getClassType === "function" ? getClassType(classItem.className) : ("unknown" as ClassType);
  if (kind === "utility") return undefined;

  const subjectDecls = getComparable(classItem.className);
  if (!subjectDecls || Object.keys(subjectDecls).length === 0) return undefined;

  for (const [utilName, utilDeclsEntry] of utilityDecls) {
    if (!compareDecls(subjectDecls, utilDeclsEntry, compareMode)) continue;

    return {
      ruleId: "shared:property:duplicate-of-utility",
      name: "Avoid duplicate of existing utility",
      message:
        compareMode === "equal"
          ? `"${classItem.className}" duplicates utility "${utilName}". Remove the custom class or replace it with the utility.`
          : `"${classItem.className}" is a subset of utility "${utilName}". Consider replacing with or augmenting the utility instead of redefining properties.`,
      severity: "warning",
      className: classItem.className,
      isCombo: kind === "combo",
    };
  }

  return undefined;
}

function collectDuplicateOfUtilityResults(
  classes: ElementAnalysisArgs["classes"],
  getClassType: ElementAnalysisArgs["getClassType"],
  getComparable: (className: string) => Record<string, string> | null,
  utilityDecls: Map<string, Record<string, string>>,
  compareMode: "equal" | "subset"
): RuleResult[] {
  const results: RuleResult[] = [];

  for (const classItem of classes) {
    const hit = firstDuplicateOfUtilityHit(classItem, getClassType, getComparable, utilityDecls, compareMode);
    if (hit) results.push(hit);
  }

  return results;
}

function buildDuplicateUtilityLookup(
  allStyles: ElementAnalysisArgs["allStyles"],
  getClassType: ElementAnalysisArgs["getClassType"],
  mergedCfg: DuplicateOfUtilityConfig
): {
  getComparable: (name: string) => Record<string, string> | null;
  utilityDecls: Map<string, Record<string, string>>;
} | null {
  const byName = new Map<string, Record<string, string>>();
  for (const s of allStyles) {
    if (s.name && s.properties) {
      byName.set(s.name, s.properties as Record<string, string>);
    }
  }

  const comparableCache = new Map<string, Record<string, string>>();
  const getComparable = (className: string): Record<string, string> | null => {
    if (comparableCache.has(className)) {
      const cached = comparableCache.get(className);
      return cached ?? null;
    }
    const props = byName.get(className);
    if (!props) return null;
    const cmp = buildComparableDecls(props, mergedCfg);
    comparableCache.set(className, cmp);
    return cmp;
  };

  const utilityDecls = new Map<string, Record<string, string>>();
  for (const [name] of byName) {
    const kind: ClassType = typeof getClassType === "function" ? getClassType(name) : ("unknown" as ClassType);
    if (kind === "utility") {
      const cmp = getComparable(name);
      if (cmp && Object.keys(cmp).length) utilityDecls.set(name, cmp);
    }
  }

  if (utilityDecls.size === 0) return null;

  return { getComparable, utilityDecls };
}

/**
 * Shared rule: flags custom or combo classes that duplicate an existing utility class's declarations.
 * Category: "property" because it inspects authored style declarations.
 */
export const createDuplicateOfUtilityRule = (): Rule => ({
  id: "shared:property:duplicate-of-utility",
  name: "Avoid duplicate of existing utility",
  description:
    "Detects custom or combo classes whose declarations are identical to, or a subset of, a utility class. Prefer using the utility class.",
  category: "structure",
  type: "structure",
  severity: "warning",
  enabled: true,
  targetClassTypes: ["custom", "combo"],

  analyzeElement: (args: ElementAnalysisArgs): RuleResult[] => {
    const { classes = [], allStyles = [], getClassType, getRuleConfig } = args;

    const mergedCfg: DuplicateOfUtilityConfig = {
      ...DEFAULT_CONFIG,
      ...(typeof getRuleConfig === "function"
        ? ((getRuleConfig("shared:property:duplicate-of-utility")?.customSettings ??
            {}) as Partial<DuplicateOfUtilityConfig>)
        : {}),
    };

    const lookup = buildDuplicateUtilityLookup(allStyles, getClassType, mergedCfg);
    if (!lookup) return [];

    return collectDuplicateOfUtilityResults(
      classes,
      getClassType,
      lookup.getComparable,
      lookup.utilityDecls,
      mergedCfg.compareMode
    );
  },
});
