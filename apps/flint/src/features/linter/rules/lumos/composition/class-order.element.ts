import type {
  ClassType,
  ElementAnalysisArgs,
  ElementClassItem,
  RuleResult,
  StructureRule,
} from "@/features/linter/model/rule.types";

// Simple classifiers for variants and utilities
const isVariant = (name: string) => /^is[_-]/.test(name);
const isUtility = (name: string, classType: ClassType) => classType === "utility" || /^u[_-]/.test(name);

function lumosVariantAfterUtilityViolation(
  className: string,
  isCombo: boolean | undefined,
  comboIndex: number | undefined,
  seenUtility: boolean,
  existingViolation: RuleResult | null,
  elementId: string
): RuleResult | null {
  if (!seenUtility || existingViolation) return null;
  return {
    ruleId: "lumos:composition:class-order",
    name: "Base class must precede variants and utilities",
    message: `Variant class "${className}" appears after a utility class. Variants must come before utilities.`,
    severity: "error",
    className,
    elementId,
    isCombo: Boolean(isCombo),
    comboIndex,
  };
}

function lumosBaseAfterModifierViolation(
  className: string,
  isCombo: boolean | undefined,
  comboIndex: number | undefined,
  baseLike: boolean,
  seenVariant: boolean,
  seenUtility: boolean,
  existingViolation: RuleResult | null,
  elementId: string
): RuleResult | null {
  if (!baseLike || (!seenVariant && !seenUtility) || existingViolation) return null;
  const phase = seenUtility ? "a utility" : "a variant";
  return {
    ruleId: "lumos:composition:class-order",
    name: "Base class must precede variants and utilities",
    message: `Base class "${className}" appears after ${phase} class. Base must come first.`,
    severity: "error",
    className,
    elementId,
    isCombo: Boolean(isCombo),
    comboIndex,
  };
}

function scanLumosClassOrder(
  ordered: ElementClassItem[],
  elementId: string,
  getClassType: (className: string, isCombo?: boolean) => ClassType
): { firstViolation: RuleResult | null; base: string[]; variants: string[]; utilities: string[] } {
  const base: string[] = [];
  const variants: string[] = [];
  const utilities: string[] = [];

  let seenVariant = false;
  let seenUtility = false;
  let firstViolation: RuleResult | null = null;

  for (const c of ordered) {
    const type = getClassType(c.className, c.isCombo);
    const util = isUtility(c.className, type);
    const variant = !util && isVariant(c.className);
    const baseLike = !util && !variant;

    if (util) utilities.push(c.className);
    else if (variant) variants.push(c.className);
    else base.push(c.className);

    if (util) {
      seenUtility = true;
      continue;
    }
    if (variant) {
      const v = lumosVariantAfterUtilityViolation(
        c.className,
        c.isCombo,
        c.comboIndex,
        seenUtility,
        firstViolation,
        elementId
      );
      if (v) firstViolation = v;
      seenVariant = true;
      continue;
    }
    const b = lumosBaseAfterModifierViolation(
      c.className,
      c.isCombo,
      c.comboIndex,
      baseLike,
      seenVariant,
      seenUtility,
      firstViolation,
      elementId
    );
    if (b) firstViolation = b;
  }

  return { firstViolation, base, variants, utilities };
}

export const createLumosClassOrderRule = (): StructureRule => ({
  id: "lumos:composition:class-order",
  name: "Base class must precede variants and utilities",
  description:
    "Within an element, base classes (custom/component/combo) must come before variant classes (is-*) and utility classes (u-*).",
  type: "structure", // element-scope per tests
  category: "structure", // align with tests expecting 'structure'
  severity: "error",
  enabled: true,
  example: "base_custom is-active u-hidden",

  analyzeElement: (args: ElementAnalysisArgs): RuleResult[] => {
    const { classes, getClassType, elementId } = args;
    if (!classes?.length || !getClassType) return [];

    const ordered = [...classes].sort((a, b) => a.order - b.order);
    const { firstViolation, base, variants, utilities } = scanLumosClassOrder(ordered, elementId, getClassType);

    if (!firstViolation) return [];

    // Build canonical order, preserving relative order within each bucket
    const desiredOrder = [...base, ...variants, ...utilities];
    const currentOrder = ordered.map((x) => x.className);

    const needsFix = desiredOrder.length === currentOrder.length && desiredOrder.some((n, i) => n !== currentOrder[i]);

    return [
      {
        ...firstViolation,
        example: "base_custom is-active u-hidden",
        metadata: {
          currentOrder,
          desiredOrder,
        },
        ...(needsFix
          ? {
              fix: {
                kind: "reorder-classes",
                order: desiredOrder,
                scope: "element",
              } as const,
            }
          : {}),
      },
    ];
  },
});
