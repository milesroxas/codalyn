import { convertColorToHex } from "@/features/linter/lib/color-utils";
import type { PropertyRule, RuleConfigSchema, RuleContext, RuleResult } from "@/features/linter/model/rule.types";

interface ColorVariableConfig {
  targetProperties: string[];
}

const colorVariableConfigSchema: RuleConfigSchema = {
  targetProperties: {
    label: "Target Color Properties",
    type: "string[]",
    description: "CSS properties that must use color variables",
    default: ["background-color", "color"],
  },
};

const DEFAULT_CONFIG: ColorVariableConfig = {
  targetProperties: ["background-color", "color"],
};

/**
 * Checks if a property value is a Webflow color variable.
 * Variables are represented as objects with an "id" field in the properties.
 */
const isColorVariable = (value: unknown): boolean => {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as any).id === "string" &&
    (value as any).id.startsWith("variable-")
  );
};

const isZeroOpacity = (value: string): boolean => {
  const rgbaMatch = value.match(/^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/i);
  if (rgbaMatch) return parseFloat(rgbaMatch[1]) === 0;
  const hslaMatch = value.match(/^hsla?\(\s*[\d.]+\s*,\s*[\d.%]+\s*,\s*[\d.%]+\s*,\s*([\d.]+)\s*\)$/i);
  if (hslaMatch) return parseFloat(hslaMatch[1]) === 0;
  return false;
};

function shouldSkipColorInspection(propertyValue: unknown): boolean {
  return (
    propertyValue === undefined ||
    propertyValue === null ||
    propertyValue === "inherit" ||
    propertyValue === "currentColor" ||
    propertyValue === "transparent" ||
    (typeof propertyValue === "string" && isZeroOpacity(propertyValue))
  );
}

function isHardcodedColorCandidate(propertyValue: unknown): boolean {
  return (
    typeof propertyValue === "string" &&
    (propertyValue.startsWith("hsla(") ||
      propertyValue.startsWith("rgba(") ||
      propertyValue.startsWith("rgb(") ||
      propertyValue.startsWith("hsl(") ||
      propertyValue.startsWith("#") ||
      /^[a-z]+$/i.test(propertyValue))
  );
}

/**
 * Shared rule: ensures color properties use Webflow variables instead of hardcoded values.
 * Supports configurable list of color properties to check.
 */
export const createColorVariableRule = (): PropertyRule => ({
  id: "shared:property:color-variable",
  name: "Use Color Variables",
  description:
    "Color properties should use Webflow variables instead of hardcoded color values for better maintainability and design system consistency.",
  example: "Use a variable instead of #ff4444",
  severity: "error",
  category: "maintainability",
  type: "property",
  config: colorVariableConfigSchema,
  targetClassTypes: ["custom", "utility", "combo"],
  enabled: true,
  analyze: (
    className: string,
    properties: Record<string, unknown>,
    context: RuleContext & { config?: Record<string, unknown> }
  ): RuleResult[] => {
    try {
      // Merge config with defaults
      const ruleConfig: ColorVariableConfig = {
        ...DEFAULT_CONFIG,
      };

      // Override with custom config if provided
      if (context.config?.targetProperties) {
        ruleConfig.targetProperties = context.config.targetProperties as string[];
      }

      const results: RuleResult[] = [];

      for (const propertyName of ruleConfig.targetProperties) {
        const propertyValue = properties[propertyName];

        if (shouldSkipColorInspection(propertyValue)) {
          continue;
        }

        if (isColorVariable(propertyValue)) {
          continue;
        }

        if (!isHardcodedColorCandidate(propertyValue)) {
          continue;
        }

        results.push({
          ruleId: "shared:property:color-variable",
          name: "Use Color Variables",
          message: `Property "${propertyName}" uses hardcoded color "${convertColorToHex(
            propertyValue as string
          )}". Consider using a Webflow color variable for better maintainability.`,
          severity: "warning",
          className,
          isCombo: false, // Will be set correctly by the rule runner
          metadata: {
            propertyName,
            currentValue: convertColorToHex(propertyValue as string),
            suggestion: "Replace with a Webflow color variable",
          },
        });
      }

      return results;
    } catch (error) {
      console.error(`Error analyzing color variables for class "${className}":`, error);
      return [];
    }
  },
});
