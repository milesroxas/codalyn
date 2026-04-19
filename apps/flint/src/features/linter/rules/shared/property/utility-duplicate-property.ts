import type { StyleInfo } from "@/entities/style/model/style.types";
import { isClientFirstDashlessSemanticClassName } from "@/features/linter/grammar/client-first.grammar";
import { formatStyleValueForLint } from "@/features/linter/lib/style-value-format";
import { isThirdPartyClass } from "@/features/linter/lib/third-party-libraries";
import type { ElementAnalysisArgs, RuleResult, StructureRule } from "@/features/linter/model/rule.types";

/**
 * Configuration for utility duplicate property detection.
 */
type UtilityDuplicatePropertyConfig = {
  /** Ignored aliases that are intentionally equivalent */
  ignoredAliases?: string[][];
  /** Utility classes to skip entirely (e.g. premade template classes) */
  ignoredClasses?: string[];
  /** Minimum class count to report duplicates */
  minClassCount?: number;
  /** Only report single-property utilities */
  onlySingleProperty?: boolean;
  /** Optional list of properties to check */
  propertyAllowlist?: string[];
  /** Properties to skip checking */
  propertyBlocklist?: string[];
};

const DEFAULT_CONFIG: UtilityDuplicatePropertyConfig = {
  ignoredAliases: [],
  ignoredClasses: [],
  minClassCount: 2,
  onlySingleProperty: false, // Allow both single and multi-property duplicate detection
  propertyAllowlist: undefined,
  propertyBlocklist: undefined,
};

function utilityStyleEligibleForPropertyMap(
  style: StyleInfo,
  getClassType: ElementAnalysisArgs["getClassType"],
  config: UtilityDuplicatePropertyConfig,
  skipCfDashlessSemanticUtility: (name: string) => boolean,
  ignoredClassesSet: Set<string>
): boolean {
  if (!style.name || !style.properties) return false;
  if (getClassType(style.name) !== "utility") return false;
  if (skipCfDashlessSemanticUtility(style.name)) return false;
  if (isThirdPartyClass(style.name)) return false;
  if (ignoredClassesSet.has(style.name)) return false;
  const propEntries = Object.entries(style.properties);
  if (config.onlySingleProperty && propEntries.length !== 1) return false;
  return true;
}

function recordPropertyValueForClass(
  styleName: string,
  property: string,
  value: unknown,
  config: UtilityDuplicatePropertyConfig,
  propertyToClassesMap: Map<string, Map<string, Set<string>>>
): void {
  if (config.propertyAllowlist && !config.propertyAllowlist.includes(property)) {
    return;
  }
  if (config.propertyBlocklist?.includes(property)) {
    return;
  }

  const valueKey = JSON.stringify(value);

  if (!propertyToClassesMap.has(property)) {
    propertyToClassesMap.set(property, new Map<string, Set<string>>());
  }

  const propertyMap = propertyToClassesMap.get(property);
  if (!propertyMap) return;

  if (!propertyMap.has(valueKey)) {
    propertyMap.set(valueKey, new Set<string>());
  }

  propertyMap.get(valueKey)?.add(styleName);
}

function buildUtilityPropertyToClassesMap(
  allStyles: StyleInfo[],
  getClassType: ElementAnalysisArgs["getClassType"],
  config: UtilityDuplicatePropertyConfig,
  skipCfDashlessSemanticUtility: (name: string) => boolean,
  ignoredClassesSet: Set<string>
): Map<string, Map<string, Set<string>>> {
  const propertyToClassesMap = new Map<string, Map<string, Set<string>>>();

  for (const style of allStyles) {
    if (
      !utilityStyleEligibleForPropertyMap(style, getClassType, config, skipCfDashlessSemanticUtility, ignoredClassesSet)
    ) {
      continue;
    }

    for (const [property, value] of Object.entries(style.properties ?? {})) {
      recordPropertyValueForClass(style.name, property, value, config, propertyToClassesMap);
    }
  }

  return propertyToClassesMap;
}

function tryMultiPropertySetDuplicateResult(
  className: string,
  propEntries: [string, unknown][],
  allStyles: StyleInfo[],
  getClassType: ElementAnalysisArgs["getClassType"],
  config: UtilityDuplicatePropertyConfig,
  skipCfDashlessSemanticUtility: (name: string) => boolean,
  ignoredClassesSet: Set<string>,
  variableNameById: ElementAnalysisArgs["variableNameById"]
): RuleResult | undefined {
  if (propEntries.length <= 1) return undefined;

  const propertyFingerprint = JSON.stringify(Object.fromEntries(propEntries.sort(([a], [b]) => a.localeCompare(b))));

  const utilitiesWithSameProperties = allStyles
    .filter(
      (s) =>
        s.name &&
        getClassType(s.name) === "utility" &&
        !skipCfDashlessSemanticUtility(s.name) &&
        !isThirdPartyClass(s.name) &&
        !ignoredClassesSet.has(s.name)
    )
    .filter((s) => {
      if (!s.properties) return false;
      const otherEntries = Object.entries(s.properties);
      if (otherEntries.length !== propEntries.length) return false;

      const otherFingerprint = JSON.stringify(Object.fromEntries(otherEntries.sort(([a], [b]) => a.localeCompare(b))));
      return otherFingerprint === propertyFingerprint;
    });

  const minClassCountForMulti = config.minClassCount ?? DEFAULT_CONFIG.minClassCount ?? 2;
  if (utilitiesWithSameProperties.length < minClassCountForMulti) return undefined;

  const ignoredAliases = Array.isArray(config.ignoredAliases)
    ? (config.ignoredAliases as string[][])
    : DEFAULT_CONFIG.ignoredAliases || [];
  const filteredUtilities = utilitiesWithSameProperties.filter(
    (s) => !ignoredAliases.some((group) => group.includes(s.name))
  );

  if (filteredUtilities.length < minClassCountForMulti) return undefined;

  filteredUtilities.sort((a, b) => a.order - b.order);
  const newestUtility = filteredUtilities[filteredUtilities.length - 1];

  if (newestUtility.name !== className) return undefined;

  const oldestUtility = filteredUtilities[0];
  const otherUtilityNames = filteredUtilities.slice(0, -1).map((s) => s.name);

  const propertyList = propEntries
    .map(([prop, val]) => `${prop}: ${formatStyleValueForLint(val, variableNameById)}`)
    .join(", ");

  return {
    ruleId: "canonical:utility-duplicate-property",
    name: "Consolidate duplicate utility properties",
    message: `This utility duplicates the complete property set (${propertyList}) provided by ${otherUtilityNames.join(
      ", "
    )}. Consider using the existing "${oldestUtility.name}" instead.`,
    severity: "warning",
    className,
    isCombo: false,
    metadata: {
      properties: Object.fromEntries(propEntries.map(([k, v]) => [k, formatStyleValueForLint(v, variableNameById)])),
      duplicates: otherUtilityNames,
      canonicalSuggestion: oldestUtility.name,
      isNewestDuplicate: true,
      isCompletePropertySetDuplicate: true,
      allDuplicates: filteredUtilities.map((s) => ({
        name: s.name,
        order: s.order,
      })),
    },
  };
}

function trySinglePropertyDuplicateResult(
  className: string,
  property: string,
  value: unknown,
  propertyToClassesMap: Map<string, Map<string, Set<string>>>,
  allStyles: StyleInfo[],
  getClassType: ElementAnalysisArgs["getClassType"],
  config: UtilityDuplicatePropertyConfig,
  variableNameById: ElementAnalysisArgs["variableNameById"]
): RuleResult | undefined {
  if (config.propertyAllowlist && !config.propertyAllowlist.includes(property)) {
    return undefined;
  }
  if (config.propertyBlocklist?.includes(property)) {
    return undefined;
  }

  const valueStr = formatStyleValueForLint(value, variableNameById);
  const classesWithSameProperty = propertyToClassesMap.get(property)?.get(JSON.stringify(value));

  const minClassCount = config.minClassCount ?? DEFAULT_CONFIG.minClassCount ?? 2;
  if (!classesWithSameProperty || classesWithSameProperty.size < minClassCount) {
    return undefined;
  }

  const allDuplicateUtilities = Array.from(classesWithSameProperty)
    .filter((cls): cls is string => typeof cls === "string")
    .filter((cls) => getClassType(cls) === "utility");

  if (allDuplicateUtilities.length < minClassCount) {
    return undefined;
  }

  const ignoredAliases = Array.isArray(config.ignoredAliases)
    ? (config.ignoredAliases as string[][])
    : DEFAULT_CONFIG.ignoredAliases || [];
  const filteredAllDuplicates = allDuplicateUtilities.filter(
    (cls) => !ignoredAliases.some((group) => group.includes(cls))
  );

  if (filteredAllDuplicates.length < minClassCount) {
    return undefined;
  }

  const duplicateStyleInfos = filteredAllDuplicates
    .map((cls) => allStyles.find((s) => s.name === cls))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  duplicateStyleInfos.sort((a, b) => a.order - b.order);

  const newestStyle = duplicateStyleInfos[duplicateStyleInfos.length - 1];

  if (newestStyle.name !== className) {
    return undefined;
  }

  const oldestStyle = duplicateStyleInfos[0];
  const otherUtilities = duplicateStyleInfos.slice(0, -1).map((s) => s.name);

  return {
    ruleId: "canonical:utility-duplicate-property",
    name: "Consolidate duplicate utility properties",
    message: `This utility duplicates ${property}: ${valueStr} provided by ${otherUtilities.join(
      ", "
    )}. Consider using the existing "${oldestStyle.name}" instead.`,
    severity: "warning",
    className,
    isCombo: false,
    metadata: {
      property,
      value: valueStr,
      duplicates: otherUtilities,
      canonicalSuggestion: oldestStyle.name,
      isNewestDuplicate: true,
      allDuplicates: duplicateStyleInfos.map((s) => ({
        name: s.name,
        order: s.order,
      })),
    },
  };
}

function mergeUtilityDuplicatePropertyRuleConfig(
  presetDefaults: Partial<UtilityDuplicatePropertyConfig>,
  getRuleConfig: ElementAnalysisArgs["getRuleConfig"]
): UtilityDuplicatePropertyConfig {
  const ruleConfig = getRuleConfig("canonical:utility-duplicate-property");
  const userConfig = ruleConfig?.customSettings || {};

  return {
    ...DEFAULT_CONFIG,
    ...presetDefaults,
    ...userConfig,
    ignoredClasses: [
      ...(DEFAULT_CONFIG.ignoredClasses ?? []),
      ...(presetDefaults.ignoredClasses ?? []),
      ...((userConfig as UtilityDuplicatePropertyConfig).ignoredClasses ?? []),
    ],
    ignoredAliases: [
      ...(DEFAULT_CONFIG.ignoredAliases ?? []),
      ...(presetDefaults.ignoredAliases ?? []),
      ...((userConfig as UtilityDuplicatePropertyConfig).ignoredAliases ?? []),
    ],
  };
}

function scanOneClassForUtilityDuplicateViolations(
  classItem: ElementAnalysisArgs["classes"][number],
  allStyles: StyleInfo[],
  getClassType: ElementAnalysisArgs["getClassType"],
  config: UtilityDuplicatePropertyConfig,
  skipCfDashlessSemanticUtility: (name: string) => boolean,
  ignoredClassesSet: Set<string>,
  propertyToClassesMap: Map<string, Map<string, Set<string>>>,
  variableNameById: ElementAnalysisArgs["variableNameById"]
): { violation: RuleResult; stopAllClasses: boolean } | undefined {
  const className = classItem.className;
  const classType = getClassType(className);

  if (classType !== "utility") return undefined;

  if (skipCfDashlessSemanticUtility(className)) return undefined;

  if (ignoredClassesSet.has(className)) return undefined;

  if (isThirdPartyClass(className)) return undefined;

  const styleInfo = allStyles.find((s) => s.name === className);
  if (!styleInfo?.properties) return undefined;

  const propEntries = Object.entries(styleInfo.properties);
  if (propEntries.length === 0) return undefined;

  if (config.onlySingleProperty && propEntries.length !== 1) {
    return undefined;
  }

  const multiDup = tryMultiPropertySetDuplicateResult(
    className,
    propEntries,
    allStyles,
    getClassType,
    config,
    skipCfDashlessSemanticUtility,
    ignoredClassesSet,
    variableNameById
  );
  if (multiDup) {
    return { violation: multiDup, stopAllClasses: true };
  }

  for (const [property, value] of propEntries) {
    const singleDup = trySinglePropertyDuplicateResult(
      className,
      property,
      value,
      propertyToClassesMap,
      allStyles,
      getClassType,
      config,
      variableNameById
    );
    if (singleDup) {
      return { violation: singleDup, stopAllClasses: false };
    }
  }

  return undefined;
}

function runCanonicalUtilityDuplicatePropertyScan(
  args: ElementAnalysisArgs,
  presetDefaults: Partial<UtilityDuplicatePropertyConfig>
): RuleResult[] {
  const {
    classes = [],
    allStyles = [],
    getClassType,
    getRuleConfig,
    mergedIgnoredLintClasses,
    grammarElementSeparator,
    variableNameById,
  } = args;

  const skipCfDashlessSemanticUtility =
    grammarElementSeparator === "-" ? isClientFirstDashlessSemanticClassName : () => false;

  const config = mergeUtilityDuplicatePropertyRuleConfig(presetDefaults, getRuleConfig);

  const ignoredClassesSet = new Set([
    ...(config.ignoredClasses ?? []),
    ...(mergedIgnoredLintClasses ? Array.from(mergedIgnoredLintClasses) : []),
  ]);

  const propertyToClassesMap = buildUtilityPropertyToClassesMap(
    allStyles,
    getClassType,
    config,
    skipCfDashlessSemanticUtility,
    ignoredClassesSet
  );

  const results: RuleResult[] = [];

  for (const classItem of classes) {
    const hit = scanOneClassForUtilityDuplicateViolations(
      classItem,
      allStyles,
      getClassType,
      config,
      skipCfDashlessSemanticUtility,
      ignoredClassesSet,
      propertyToClassesMap,
      variableNameById
    );
    if (!hit) continue;

    results.push(hit.violation);
    if (hit.stopAllClasses) break;
  }

  return results;
}

/**
 * Rule: flags utility classes that duplicate the same property/value as other utilities.
 * This helps teams identify and consolidate alias utilities.
 *
 * @param presetDefaults - Optional config baked in by the preset (e.g. ignoredClasses for
 *   template-provided utilities). User-facing customSettings take precedence over these.
 */
export const createUtilityDuplicatePropertyRule = (
  presetDefaults: Partial<UtilityDuplicatePropertyConfig> = {}
): StructureRule => ({
  id: "canonical:utility-duplicate-property",
  name: "Consolidate duplicate utility properties",
  description:
    "Detects utility classes that declare the same CSS property/value as other utilities. Teams should consolidate aliases to avoid redundancy.",
  category: "structure",
  type: "structure",
  severity: "warning",
  enabled: true,
  targetClassTypes: ["utility"],

  analyzeElement: (args: ElementAnalysisArgs): RuleResult[] =>
    runCanonicalUtilityDuplicatePropertyScan(args, presetDefaults),
});
