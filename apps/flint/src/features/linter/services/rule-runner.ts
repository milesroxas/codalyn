import type { StyleInfo, StyleWithElement } from "@/entities/style/model/style.types";

import type { ElementRole, ParsedClass, RolesByElement } from "@/features/linter/model/linter.types";
import type { ClassType, Rule, RuleResult, Severity } from "@/features/linter/model/rule.types";

import type { UtilityClassAnalyzer } from "@/features/linter/services/analyzers/utility-class-analyzer";
import {
  createNamingRuleExecutor,
  createPropertyRuleExecutor,
  type NamingExecutionDeps,
} from "@/features/linter/services/executors";
import { createDebugger } from "@/shared/utils/debug";
import type { RuleRegistry } from "./rule-registry";

function groupStylesByElement(stylesWithElement: StyleWithElement[]) {
  const byElement = new Map<string, StyleWithElement[]>();
  const byElementClassNames = new Map<string, string[]>();
  for (const s of stylesWithElement) {
    const list = byElement.get(s.elementId) ?? [];
    list.push(s);
    byElement.set(s.elementId, list);

    const names = byElementClassNames.get(s.elementId) ?? [];
    names.push(s.name);
    byElementClassNames.set(s.elementId, names);
  }
  return { byElement, byElementClassNames };
}

function ensureRoleKeysInStyleMaps(
  rolesByElement: RolesByElement | undefined,
  byElement: Map<string, StyleWithElement[]>,
  byElementClassNames: Map<string, string[]>
): void {
  if (!rolesByElement) return;
  for (const elId of Object.keys(rolesByElement)) {
    if (!byElement.has(elId)) {
      byElement.set(elId, [] as StyleWithElement[]);
      if (!byElementClassNames.has(elId)) byElementClassNames.set(elId, []);
    }
  }
}

function buildComboIndexByElement(byElement: Map<string, StyleWithElement[]>) {
  const comboIndexByElementAndClass = new Map<string, Map<string, number>>();
  for (const [elId, list] of byElement.entries()) {
    const sorted = [...list].sort((a, b) => a.order - b.order);
    let idx = 0;
    for (const item of sorted) {
      if (item.isCombo) {
        const map = comboIndexByElementAndClass.get(elId) ?? new Map<string, number>();
        if (!comboIndexByElementAndClass.has(elId)) comboIndexByElementAndClass.set(elId, map);
        map.set(item.name, idx);
        idx += 1;
      }
    }
  }
  return comboIndexByElementAndClass;
}

function mergeResultMetadata(
  r: RuleResult,
  elementId: string,
  rolesByElement: RolesByElement | undefined,
  getParentId: ((id: string) => string | null) | undefined,
  detectionSource: string | undefined
): void {
  const role = rolesByElement ? rolesByElement[elementId] : undefined;
  const parentId = typeof getParentId === "function" ? getParentId(elementId) : undefined;
  const merged = { ...(r.metadata ?? {}), role, parentId } as Record<string, unknown>;
  if (detectionSource && !merged.detectionSource) merged.detectionSource = detectionSource;
  r.metadata = merged;
}

export const createRuleRunner = (
  ruleRegistry: RuleRegistry,
  utilityAnalyzer: UtilityClassAnalyzer,
  classTypeResolver?: (className: string, isComboFlag?: boolean) => ClassType
) => {
  const debug = createDebugger("rule-runner");
  // Authoritative classifier: resolves to your Rule ClassType
  const getClassType = (className: string, isComboFlag?: boolean): ClassType => {
    if (typeof classTypeResolver === "function") {
      try {
        return classTypeResolver(className, isComboFlag);
      } catch {
        console.error(`Error resolving class type for ${className}`);
      }
    }
    return isComboFlag === true ? "combo" : "custom";
  };

  const executeNamingRule = createNamingRuleExecutor();
  const executePropertyRule = createPropertyRuleExecutor(ruleRegistry, utilityAnalyzer);

  // Class-level dispatcher. Naming rules are delegated to the executor.
  const executeRule = (
    rule: Rule,
    className: string,
    properties: Record<string, unknown>,
    allStyles: StyleInfo[],
    elementIdForLog?: string,
    variableNameById?: ReadonlyMap<string, string>
  ): RuleResult[] => {
    try {
      const config = ruleRegistry.getRuleConfiguration(rule.id);
      const effectiveSeverity = config?.severity ?? rule.severity;

      if (rule.type === "property") {
        return executePropertyRule(
          rule as Extract<Rule, { type: "property" }>,
          className,
          properties,
          effectiveSeverity,
          allStyles,
          getClassType,
          variableNameById
        );
      }
      return [];
    } catch (err) {
      console.error(`Rule ${rule.id} failed`, {
        className,
        elementId: elementIdForLog,
        err,
      });
      return [];
    }
  };

  const runRulesOnStylesWithContext = (
    stylesWithElement: StyleWithElement[],
    _elementContextsMap: Record<string, never[]>,
    allStyles: StyleInfo[],
    rolesByElement?: RolesByElement,
    getParentId?: (elementId: string) => string | null,
    getChildrenIds?: (elementId: string) => string[],
    getAncestorIds?: (elementId: string) => string[],
    parseClass?: (name: string) => ParsedClass,
    graph?: { getTag?: (id: string) => Promise<string | null> },
    getTagName?: (id: string) => string | null,
    getElementType?: (id: string) => string | null,
    skipPageRules: boolean = false,
    grammarElementSeparator?: string,
    filteredElementIds?: Set<string>,
    siteComponentNameById?: Map<string, string>,
    componentIdByElementId?: Map<string, string>,
    placedComponentSubtreeElementIds?: ReadonlySet<string>,
    isEditingComponentDefinition?: boolean,
    variableNameById?: ReadonlyMap<string, string>,
    mergedIgnoredLintClasses?: ReadonlySet<string>
  ): RuleResult[] => {
    debug.log(
      "runRulesOnStylesWithContext: styles count",
      stylesWithElement.length,
      "allStyles count",
      allStyles.length,
      "hasRoles",
      !!rolesByElement
    );
    const results: RuleResult[] = [];

    const { byElement, byElementClassNames } = groupStylesByElement(stylesWithElement);
    ensureRoleKeysInStyleMaps(rolesByElement, byElement, byElementClassNames);
    const comboIndexByElementAndClass = buildComboIndexByElement(byElement);

    const normalizeAndAppendPageResults = (
      pageResults: RuleResult[],
      pr: NonNullable<ReturnType<RuleRegistry["getPageRules"]>>[number]
    ): void => {
      const cfg = ruleRegistry.getRuleConfiguration(pr.id);
      for (const r of pageResults) {
        r.severity = r.severity ?? cfg?.severity ?? pr.severity;
      }
      results.push(...pageResults);
    };

    const runPageRulesPhase = (): void => {
      if (!ruleRegistry.getPageRules || skipPageRules) return;
      debug.log("running page rules");
      const pageGraph = {
        getParentId: getParentId ?? (() => null),
        getChildrenIds: getChildrenIds ?? (() => []),
        getAncestorIds: getAncestorIds ?? (() => []),
        getDescendantIds: () => [],
        getTag: graph?.getTag ?? (async () => await Promise.resolve(null)),
      };
      const pageAnalyzePayload = {
        rolesByElement: rolesByElement ?? {},
        graph: pageGraph,
        styles: stylesWithElement,
        getRoleForElement: (id: string) => rolesByElement?.[id] || "unknown",
        getRuleConfig: (ruleId: string) => ({
          ruleId,
          enabled: true,
          severity: "error" as const,
          customSettings: {} as any,
        }),
        getTagName: getTagName ?? (() => null),
        getElementType: getElementType ?? (() => null),
        siteComponentNameById,
        componentIdByElementId,
      };
      const pageRules = (ruleRegistry.getPageRules?.() ?? []).filter(
        (r) => (ruleRegistry.getRuleConfiguration(r.id)?.enabled ?? true) === true
      );
      for (const pr of pageRules) {
        normalizeAndAppendPageResults(pr.analyzePage(pageAnalyzePayload), pr);
      }
    };

    const buildElementAnalyzeArgs = (elId: string, list: StyleWithElement[]) => ({
      elementId: elId,
      classes: list.map((i) => ({
        className: i.name,
        order: i.order,
        elementId: i.elementId,
        isCombo: i.isCombo,
        comboIndex: i.isCombo ? (comboIndexByElementAndClass.get(elId)?.get(i.name) ?? undefined) : undefined,
        detectionSource: i.detectionSource,
      })),
      allStyles,
      getClassType,
      getRuleConfig: (id: string) => ruleRegistry.getRuleConfiguration(id),
      rolesByElement,
      getRoleForElement: (id: string): ElementRole => rolesByElement?.[id] ?? "unknown",
      getParentId,
      getChildrenIds,
      getAncestorIds,
      getClassNamesForElement: (id: string) => byElementClassNames.get(id) ?? [],
      parseClass,
      grammarElementSeparator,
      getTagName,
      getElementType,
      componentIdByElementId,
      siteComponentNameById,
      placedComponentSubtreeElementIds,
      isEditingComponentDefinition,
      variableNameById,
      mergedIgnoredLintClasses,
    });

    const stampElementAnalyzeResults = (
      elementResults: RuleResult[],
      elId: string,
      cfg: ReturnType<RuleRegistry["getRuleConfiguration"]>,
      rule: Rule
    ): void => {
      for (const r of elementResults) {
        r.elementId = elId;
        r.severity = r.severity ?? cfg?.severity ?? rule.severity;
        const role = rolesByElement ? rolesByElement[elId] : undefined;
        const parentId = typeof getParentId === "function" ? getParentId(elId) : undefined;
        r.metadata = { ...(r.metadata ?? {}), role, parentId };
      }
    };

    const applyElementAnalyzeRule = (elId: string, list: StyleWithElement[], rule: Rule): void => {
      if (typeof rule.analyzeElement !== "function") return;
      const cfg = ruleRegistry.getRuleConfiguration(rule.id);
      if (!(cfg?.enabled ?? rule.enabled)) return;
      const elementResults = rule.analyzeElement(buildElementAnalyzeArgs(elId, list));
      stampElementAnalyzeResults(elementResults, elId, cfg, rule);
      results.push(...elementResults);
    };

    const runElementAnalyzePhase = (): void => {
      const allRules = ruleRegistry.getAllRules();
      for (const [elId, list] of byElement.entries()) {
        if (filteredElementIds?.has(elId) && list.length === 0) continue;
        for (const rule of allRules) {
          applyElementAnalyzeRule(elId, list, rule);
        }
      }
    };

    const namingDeps = (): NamingExecutionDeps => ({
      getRoleForElement: (id: string) => rolesByElement?.[id] ?? "unknown",
      getClassType,
      suggestName: undefined,
      resolveSeverity: (ruleId: string) => ruleRegistry.getRuleConfiguration(ruleId)?.severity as Severity | undefined,
    });

    const processClassStyleRow = (style: StyleWithElement): void => {
      const { name, properties, elementId, isCombo, detectionSource } = style;
      const classType = getClassType(name, isCombo);
      const applicableRules = ruleRegistry
        .getRulesByClassType(classType)
        .filter((rule) => {
          const config = ruleRegistry.getRuleConfiguration(rule.id);
          return (config?.enabled ?? rule.enabled) === true;
        })
        .sort((a, b) => a.id.localeCompare(b.id));

      for (const rule of applicableRules) {
        const cfg = ruleRegistry.getRuleConfiguration(rule.id);
        const effectiveSeverity = cfg?.severity ?? rule.severity;

        if (rule.type === "naming") {
          const comboIndex = isCombo && elementId ? comboIndexByElementAndClass.get(elementId)?.get(name) : undefined;
          const namingResults = executeNamingRule(
            rule as Extract<Rule, { type: "naming" }>,
            {
              elementId,
              className: name,
              isCombo,
              comboIndex,
              severityDefault: effectiveSeverity,
              configForRule: cfg?.customSettings,
            },
            namingDeps()
          );
          namingResults.forEach((r) => {
            r.elementId = elementId;
            mergeResultMetadata(r, elementId, rolesByElement, getParentId, detectionSource);
            if (isCombo && r.isCombo && r.comboIndex == null) {
              r.comboIndex = comboIndex;
            }
          });
          results.push(...namingResults);
          continue;
        }

        const ruleResults = executeRule(
          rule,
          name,
          properties as Record<string, unknown>,
          allStyles,
          elementId,
          variableNameById
        );
        ruleResults.forEach((r) => {
          r.elementId = elementId;
          mergeResultMetadata(r, elementId, rolesByElement, getParentId, detectionSource);
          if (isCombo && r.isCombo && r.comboIndex == null) {
            r.comboIndex = comboIndexByElementAndClass.get(elementId)?.get(name);
          }
        });
        results.push(...ruleResults);
      }
    };

    const runClassLevelPhase = (): void => {
      for (const style of stylesWithElement) {
        processClassStyleRow(style);
      }
    };

    runPageRulesPhase();
    runElementAnalyzePhase();
    runClassLevelPhase();

    debug.log("runRulesOnStylesWithContext: total results", results.length);
    return results;
  };

  return {
    runRulesOnStylesWithContext,
  } as const;
};

export type RuleRunner = ReturnType<typeof createRuleRunner>;
