// src/features/linter/rules/canonical/main-children.page.ts

import type { ElementGraph } from "@/entities/element/services/element-graph.service";
import type { ElementRole } from "@/features/linter/model/linter.types";
import type { PageRule, RuleResult, Severity } from "@/features/linter/model/rule.types";

function mainSubtreeHasSemanticContent(
  graph: ElementGraph,
  mainElementId: string,
  getRoleForElement: (id: string) => ElementRole | "unknown",
  getElementType: (id: string) => string | null
): { hasSemantic: boolean; foundRoles: ElementRole[] } {
  const queue: string[] = [...graph.getChildrenIds(mainElementId)];
  const visited = new Set<string>();
  const foundRoles: ElementRole[] = [];

  while (queue.length > 0) {
    const currentElementId = queue.shift();

    if (!currentElementId || visited.has(currentElementId)) {
      continue;
    }
    visited.add(currentElementId);

    const role: ElementRole = getRoleForElement(currentElementId);
    const elementType = getElementType(currentElementId);
    foundRoles.push(role);

    if (role === "section" || role === "componentRoot" || elementType === "ComponentInstance") {
      return { hasSemantic: true, foundRoles };
    }

    const children = graph.getChildrenIds(currentElementId);
    for (const childId of children) {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    }
  }

  return { hasSemantic: false, foundRoles };
}

export const createMainChildrenPageRule = (): PageRule => ({
  id: "canonical:main-children",
  name: "Main should contain sections or component roots",
  description:
    "Ensures main element contains semantic content like sections or component roots as direct or descendant children",
  type: "page",
  category: "structure",
  severity: "error",
  enabled: true,

  analyzePage: ({ rolesByElement, graph, getRoleForElement, getElementType }): RuleResult[] => {
    const mainEntry = Object.entries(rolesByElement).find(([, role]) => role === "main");

    if (!mainEntry) return [];

    const [mainElementId] = mainEntry;

    const { hasSemantic, foundRoles } = mainSubtreeHasSemanticContent(
      graph,
      mainElementId,
      getRoleForElement,
      getElementType
    );

    if (hasSemantic) {
      return [];
    }

    const uniqueRoles = [...new Set(foundRoles)].filter((role) => role !== "unknown");
    const foundRolesText =
      uniqueRoles.length > 0 ? ` Found roles: ${uniqueRoles.join(", ")}.` : " No semantic roles found.";

    const result: RuleResult = {
      ruleId: "canonical:main-children",
      name: "Main should contain sections or component roots",
      message: `Main element must contain at least one section or component root.${foundRolesText}`,
      severity: "error" as Severity,
      elementId: mainElementId,
      className: "",
      isCombo: false,
    };

    return [result];
  },
});
