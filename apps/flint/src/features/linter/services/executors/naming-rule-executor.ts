import type { ElementRole } from "@/features/linter/model/linter.types";
import type { ClassType, Rule, RuleResult, Severity } from "@/features/linter/model/rule.types";

import type { RuleConfigurationService } from "@/features/linter/services/rule-configuration-service";

// Deps injected by the runner
export type ExecutionDeps = {
  getRoleForElement?: (id: string) => ElementRole;
  getClassType: (name: string, isCombo?: boolean) => ClassType;
  suggestName?: (name: string, role?: ElementRole) => string | null;
  ruleConfigService?: RuleConfigurationService;
  resolveSeverity?: (ruleId: string) => Severity | undefined;
};

export type NamingExecInput = {
  elementId?: string;
  className: string;
  isCombo?: boolean;
  comboIndex?: number;
  severityDefault: Severity;
  configForRule?: Record<string, unknown>;
};

export type NamingRule = Extract<Rule, { type: "naming" }>;

export type NamingRuleExecutor = (rule: NamingRule, input: NamingExecInput, deps: ExecutionDeps) => RuleResult[];

function ruleResultFromNamingEvaluate(
  rule: NamingRule,
  evaluated: NonNullable<ReturnType<NonNullable<NamingRule["evaluate"]>>>,
  className: string,
  isCombo: boolean | undefined,
  severity: Severity,
  elementId: string | undefined,
  role: ElementRole,
  classType: ClassType,
  comboIndex: number | undefined
): RuleResult {
  return {
    ruleId: evaluated.ruleId ?? rule.id,
    name: evaluated.name ?? rule.name,
    message: evaluated.message ?? rule.description,
    severity: evaluated.severity ?? severity,
    className,
    isCombo: evaluated.isCombo ?? Boolean(isCombo),
    metadata: {
      ...(evaluated.metadata ?? {}),
      elementId,
      role,
      classType,
      comboIndex,
    },
    ...(evaluated.example ? { example: evaluated.example } : {}),
    ...(evaluated.expandedViewCapabilities ? { expandedViewCapabilities: evaluated.expandedViewCapabilities } : {}),
  };
}

function baseMessageForFailedNamingTest(rule: NamingRule, className: string): string {
  const r = rule as any;
  if (!("message" in rule) || r.message === undefined) {
    return rule.description || `Invalid class format for "${className}".`;
  }
  return typeof r.message === "function" ? r.message(className) : r.message;
}

function shouldSkipUtilityOnlyNamingRule(classType: ClassType, rule: NamingRule): boolean {
  return classType === "utility" && !rule.targetClassTypes.includes("utility");
}

function resolveNamingElementRole(
  elementId: string | undefined,
  getRoleForElement?: (id: string) => ElementRole
): ElementRole {
  return elementId && getRoleForElement ? (getRoleForElement(elementId) ?? "unknown") : "unknown";
}

function violationFromNamingTest(
  rule: NamingRule,
  className: string,
  severity: Severity,
  isCombo: boolean | undefined,
  elementId: string | undefined,
  role: ElementRole,
  classType: ClassType,
  comboIndex: number | undefined,
  suggestName: ExecutionDeps["suggestName"]
): RuleResult[] {
  const baseMessage = baseMessageForFailedNamingTest(rule, className);
  const suggestion = suggestName?.(className, role);
  const violation: RuleResult = {
    ruleId: rule.id,
    name: rule.name,
    message: baseMessage,
    severity,
    className,
    isCombo: Boolean(isCombo),
    metadata: {
      elementId,
      role,
      classType,
      comboIndex,
      fix:
        suggestion && suggestion !== className
          ? {
              kind: "rename-class",
              from: className,
              to: suggestion,
              scope: "element",
            }
          : undefined,
    },
    ...(rule.example ? { example: rule.example } : {}),
  };
  return [violation];
}

export const createNamingRuleExecutor = (): NamingRuleExecutor => {
  return (rule, input, deps) => {
    const { elementId, className, isCombo, comboIndex, severityDefault, configForRule } = input;
    const { getRoleForElement, getClassType, suggestName, resolveSeverity } = deps;

    const role = resolveNamingElementRole(elementId, getRoleForElement);
    const classType = getClassType(className, isCombo);

    if (shouldSkipUtilityOnlyNamingRule(classType, rule)) return [];

    const severity: Severity = resolveSeverity?.(rule.id) ?? severityDefault;

    if ("evaluate" in rule && typeof rule.evaluate === "function") {
      const evaluated = rule.evaluate(className, {
        allStyles: [],
        utilityClassPropertiesMap: new Map(),
        propertyToClassesMap: new Map(),
        config: configForRule,
      });
      if (evaluated) {
        return [
          ruleResultFromNamingEvaluate(
            rule,
            evaluated,
            className,
            isCombo,
            severity,
            elementId,
            role,
            classType,
            comboIndex
          ),
        ];
      }
    }

    if ("test" in rule && typeof rule.test === "function" && !rule.test(className)) {
      return violationFromNamingTest(
        rule,
        className,
        severity,
        isCombo,
        elementId,
        role,
        classType,
        comboIndex,
        suggestName
      );
    }

    return [];
  };
};
