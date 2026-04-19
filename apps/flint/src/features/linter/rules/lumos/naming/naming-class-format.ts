import { normalizeToUnderscoreFormat } from "@/features/linter/lib/string-normalization";
import type { NamingRule, RuleConfigSchema, RuleContext, RuleResult } from "@/features/linter/model/rule.types";

/**
 * Gets the known elements for lumos preset
 * This is the single source of truth for lumos recognized elements
 */
function getLumosKnownElements(): string[] {
  return [
    // Layout elements
    "wrap",
    "main",
    "contain",
    "container",
    "layout",
    "inner",
    "content",
    "section",
    "backdrop",
    "scroll",
    // Content elements
    "text",
    "title",
    "heading",
    "eyebrow",
    "label",
    "marker",
    // Media elements
    "icon",
    "img",
    "image",
    "logo",
    "visual",
    "svg",
    // Interactive elements
    "button",
    "link",
    "field",
    // Structure elements
    "group",
    "item",
    "list",
    "card",
    "component",
    "line",
    // Testing elements
    "x",
    "y",
    "z",
  ];
}

/**
 * Export the known elements for use by other services
 */
export { getLumosKnownElements };

function lumosInvalidCharactersResult(className: string): RuleResult {
  const suggested = normalizeToUnderscoreFormat(className);
  const hasValidSuggestion = suggested && /^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(suggested);

  return {
    ruleId: "lumos:naming:class-format",
    name: "Lumos Custom Class Format",
    message: `Class "${className}" contains invalid characters. Use only lowercase letters, numbers, and underscores.`,
    severity: "error",
    className,
    isCombo: false,
    example: "footer_wrap or hero_secondary_content_wrap",
    metadata: hasValidSuggestion ? { suggestedName: suggested } : undefined,
    fix: hasValidSuggestion ? { kind: "rename-class", from: className, to: suggested, scope: "element" } : undefined,
  };
}

function lumosTooFewSegmentsResult(className: string): RuleResult {
  const suggestedFix = `${className}_wrap`;
  return {
    ruleId: "lumos:naming:class-format",
    name: "Lumos Custom Class Format",
    message: `Class "${className}" must have at least 2 segments separated by underscores (e.g., type_element).`,
    severity: "error",
    className,
    isCombo: false,
    example: "footer_wrap or hero_secondary_content_wrap",
    metadata: { suggestedName: suggestedFix },
    fix: { kind: "rename-class", from: className, to: suggestedFix, scope: "element" },
  };
}

function lumosEmptySegmentResult(className: string, segments: string[]): RuleResult {
  const cleanedSegments = segments.filter((s) => s.length > 0);
  const suggestedFix =
    cleanedSegments.length >= 2 ? cleanedSegments.join("_") : `${cleanedSegments[0] || "element"}_wrap`;

  return {
    ruleId: "lumos:naming:class-format",
    name: "Lumos Custom Class Format",
    message: `Class "${className}" contains empty segments. Each segment must contain at least one character.`,
    severity: "error",
    className,
    isCombo: false,
    example: "footer_wrap or hero_secondary_content_wrap",
    metadata: { suggestedName: suggestedFix },
    fix: { kind: "rename-class", from: className, to: suggestedFix, scope: "element" },
  };
}

function lumosProjectDefinedElementResult(className: string, finalElement: string): RuleResult {
  return {
    ruleId: "lumos:naming:class-format",
    name: "Lumos Custom Class Format",
    message: `Class "${className}" uses project-defined element "${finalElement}".`,
    severity: "suggestion",
    className,
    isCombo: false,
  };
}

function lumosUnrecognizedElementResult(className: string, finalElement: string, suggestedFix: string): RuleResult {
  return {
    ruleId: "lumos:naming:class-format",
    name: "Lumos Custom Class Format",
    message: `Class "${className}" uses unrecognized element "${finalElement}". Consider using a known element term or adding it to project configuration.`,
    severity: "suggestion",
    className,
    isCombo: false,
    metadata: {
      unrecognizedElement: finalElement,
      suggestedName: suggestedFix,
    },
    expandedViewCapabilities: [
      {
        contentType: "recognized-elements",
        title: "View Recognized Elements",
        description: "See all recognized element names for this preset",
        isRelevantFor: (violation) => Boolean(violation.metadata?.unrecognizedElement),
      },
    ],
  };
}

const customClassConfig: RuleConfigSchema = {
  projectDefinedElements: {
    label: "Project-defined element terms",
    type: "string[]",
    description: "Custom terms that are valid as final class segments for this project (e.g. 'flag', 'chip', 'stat').",
    default: [],
  },
};

export const createLumosCustomClassFormatRule = (): NamingRule => ({
  id: "lumos:naming:class-format",
  name: "Lumos Custom Class Format",
  description:
    "Custom classes must be lowercase and underscore-separated with at least 2 segments: type_element or type_variant_element. Child group roots may include additional group segments before the final element (e.g., type[_variant]_[group]_wrap). The final segment should describe the element (e.g. wrap, text, icon).",
  example: "footer_wrap, footer_link_wrap, hero_secondary_content_wrap",
  type: "naming",
  severity: "error",
  enabled: true,
  category: "format",
  targetClassTypes: ["custom"],
  config: customClassConfig,

  test: (className: string): boolean => {
    if (className.startsWith("c-")) return false;
    return true;
  },

  evaluate: (className: string, context: RuleContext & { config?: Record<string, unknown> }): RuleResult | null => {
    if (className.startsWith("c-")) return null;

    const pattern = /^[a-z0-9_]+$/;
    if (!pattern.test(className)) {
      return lumosInvalidCharactersResult(className);
    }

    const segments = className.split("_");

    if (segments.length < 2) {
      return lumosTooFewSegmentsResult(className);
    }

    if (segments.some((s) => !s)) {
      return lumosEmptySegmentResult(className, segments);
    }

    const finalElement = segments[segments.length - 1];

    const knownElements = getLumosKnownElements();

    const projectTerms: string[] =
      (context?.config?.projectDefinedElements as string[]) ??
      (customClassConfig.projectDefinedElements.default as string[]);

    if (knownElements.includes(finalElement)) {
      return null;
    }

    if (projectTerms.includes(finalElement)) {
      return lumosProjectDefinedElementResult(className, finalElement);
    }

    const baseSegments = segments.slice(0, -1);
    const suggestedFix = `${baseSegments.join("_")}_wrap`;

    return lumosUnrecognizedElementResult(className, finalElement, suggestedFix);
  },
});
