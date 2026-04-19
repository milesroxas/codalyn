// src/features/linter/services/element-lint-service.ts

import {
  enrichSiteComponentNamesForDefinitions,
  fetchSiteComponentNameById,
} from "@/entities/component/services/component-catalog.service";
import { toElementKey } from "@/entities/element/lib/id";
import type { WebflowElement } from "@/entities/element/model/element.types";
import type { StyleWithElement } from "@/entities/style/model/style.types";
import { getIsEditingComponentDefinition } from "@/features/linter/lib/webflow-component-definition-edit-mode";
import type { RuleResult } from "@/features/linter/model/rule.types";
import type { LintContext, LintContextService } from "@/features/linter/services/lint-context.service";
import type { RuleRunner } from "@/features/linter/services/rule-runner";
import { createDebugger } from "@/shared/utils/debug";

function resolveStylesForElementLint(
  context: LintContext,
  elementId: string,
  useStructuralContext: boolean,
  debug: ReturnType<typeof createDebugger>
): { stylesToAnalyze: StyleWithElement[]; rolesForRun: LintContext["rolesByElement"] } {
  const elementStyles = context.elementStyleMap.get(elementId) || [];
  if (!useStructuralContext) {
    debug.log("lintElement: standard context analyzing", elementStyles.length, "styles for", elementId);
    return { stylesToAnalyze: elementStyles, rolesForRun: context.rolesByElement };
  }
  const stylesToAnalyze = Array.from(context.elementStyleMap.values()).flat();
  debug.log(
    "lintElement: structural context analyzing",
    stylesToAnalyze.length,
    "styles across",
    Object.keys(context.rolesByElement).length,
    "elements"
  );
  return { stylesToAnalyze, rolesForRun: context.rolesByElement };
}

function applyClassFilterToStyles(
  stylesToAnalyze: StyleWithElement[],
  classFilter: ((name: string) => boolean) | undefined
): { styles: StyleWithElement[]; ignoredClassNames: string[]; filteredElementIds: Set<string> } {
  if (!classFilter) {
    return { styles: stylesToAnalyze, ignoredClassNames: [], filteredElementIds: new Set() };
  }
  const ignoredClassNames: string[] = [];
  const filteredElementIds = new Set<string>();
  const beforeFilterIds = new Set(stylesToAnalyze.map((s) => s.elementId));
  const filtered = stylesToAnalyze.filter((s) => {
    if (!classFilter(s.name)) {
      ignoredClassNames.push(s.name);
      return false;
    }
    return true;
  });
  const afterFilterIds = new Set(filtered.map((s) => s.elementId));
  for (const id of beforeFilterIds) {
    if (!afterFilterIds.has(id)) filteredElementIds.add(id);
  }
  return { styles: filtered, ignoredClassNames, filteredElementIds };
}

export interface ElementLintOptions {
  classFilter?: (name: string) => boolean;
  mergedIgnoredLintClasses?: ReadonlySet<string>;
}

export interface ElementLintResult {
  results: RuleResult[];
  ignoredClassNames: string[];
}

export type ElementLintService = ReturnType<typeof createElementLintService>;

export function createElementLintService(deps: { contextService: LintContextService; ruleRunner: RuleRunner }) {
  const { contextService, ruleRunner } = deps;
  const debug = createDebugger("element-lint");

  async function lintElement(
    element: WebflowElement,
    pageContext?: LintContext,
    useStructuralContext: boolean = false,
    options?: ElementLintOptions
  ): Promise<ElementLintResult> {
    if (!element || typeof (element as any).getStyles !== "function") {
      const isComponentInstance =
        (element as any)?.type === "ComponentInstance" ||
        ((element as any)?.id?.component && (element as any)?.id?.element);
      if (!(useStructuralContext && isComponentInstance)) {
        debug.warn(
          "lintElement: element lacks getStyles and is not a component instance in structural mode",
          (element as any)?.type
        );
        return { results: [], ignoredClassNames: [] };
      }
    }

    // 1) Create or reuse context with optional structural context
    const context = await contextService.createElementContextWithStructural(element, useStructuralContext, pageContext);

    // 2) Collect styles to analyze
    //    - Structural ON: analyze ALL styles in the section (like page lint but scoped)
    //    - Structural OFF: analyze only the selected element (original behavior)
    const elementId = toElementKey(element);
    let { stylesToAnalyze, rolesForRun } = resolveStylesForElementLint(context, elementId, useStructuralContext, debug);

    const filtered = applyClassFilterToStyles(stylesToAnalyze, options?.classFilter);
    stylesToAnalyze = filtered.styles;
    const ignoredClassNames = filtered.ignoredClassNames;
    const filteredElementIds = filtered.filteredElementIds;

    // 4) Execute rules via the same runner API used by page scans
    //    Skip page rules when no page context is available
    const siteComponentNameById = pageContext
      ? await enrichSiteComponentNamesForDefinitions(
          await fetchSiteComponentNameById(),
          pageContext.componentIdByElementId.values()
        )
      : undefined;

    const isEditingComponentDefinition = await getIsEditingComponentDefinition();

    const results = ruleRunner.runRulesOnStylesWithContext(
      stylesToAnalyze,
      {},
      context.allStyles,
      rolesForRun,
      context.graph.getParentId,
      context.graph.getChildrenIds,
      context.graph.getAncestorIds,
      context.parseClass,
      { getTag: context.graph.getTag },
      (id: string) => context.tagByElementId.get(id) ?? null,
      (id: string) => context.elementTypeByElementId.get(id) ?? null,
      !pageContext, // Skip page rules when no page context available
      context.grammarElementSeparator,
      filteredElementIds,
      siteComponentNameById,
      // Always pass: structural / full-page context includes placed-instance ids; scan-selected has no pageContext but still needs this for rules (e.g. padding-global child severity).
      context.componentIdByElementId,
      context.placedComponentSubtreeElementIds,
      isEditingComponentDefinition,
      context.variableNameById,
      options?.mergedIgnoredLintClasses
    );

    debug.log("lintElement: rule results count", results.length);

    // When structural context is OFF, filter results to only the selected element
    // The rule runner may produce violations for child elements due to rolesByElement
    // being passed with all descendants, but we only want selected element violations
    if (!useStructuralContext) {
      const filteredResults = results.filter((r) => r.elementId === elementId);
      debug.log("lintElement: filtered to selected element only", filteredResults.length, "of", results.length);
      return { results: filteredResults, ignoredClassNames };
    }

    return { results, ignoredClassNames };
  }

  return { lintElement } as const;
}
