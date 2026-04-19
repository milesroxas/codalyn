// Canonical rules must be preset-agnostic. Avoid importing preset-specific
// heuristics; rely only on the active grammar's parseClass output.
import type { ElementRole, ParsedClass } from "@/features/linter/model/linter.types";
import type { ElementAnalysisArgs, Rule, RuleResult } from "@/features/linter/model/rule.types";

function scoreCustomNameCandidate(name: string, parseClass: (name: string) => unknown): number {
  const parsed = (parseClass(name) as ParsedClass | null) ?? null;
  const tokens = parsed?.tokens ?? name.split(/[_-]+/).filter(Boolean);
  const last = (parsed?.elementToken ?? tokens[tokens.length - 1] ?? "").toString().toLowerCase();
  const notWrapper = last !== "wrap" && last !== "wrapper";
  return (notWrapper ? 10 : 0) + tokens.length;
}

function pickBaseCustomClassName(
  elementId: string,
  list: { className: string; isCombo?: boolean }[] | undefined,
  getClassNamesForElement: (id: string) => string[] | undefined,
  getClassType: ((name: string) => string) | undefined,
  parseClass: (name: string) => unknown
): string {
  const provided = (list ?? []).map((c) => c.className).filter((n) => (getClassType?.(n) ?? "custom") === "custom");
  const raw = (getClassNamesForElement(elementId) ?? []).filter((n) => (getClassType?.(n) ?? "custom") === "custom");
  const all = Array.from(new Set<string>([...provided, ...raw]));
  if (all.length === 0) return "";

  let best = all[0];
  let bestScore = -1;
  for (const name of all) {
    const score = scoreCustomNameCandidate(name, parseClass);
    if (score > bestScore) {
      best = name;
      bestScore = score;
    }
  }
  return best;
}

function pickRootBaseClass(
  candidateId: string | null,
  getClassNamesForElement: (id: string) => string[] | undefined,
  getClassType: ((name: string) => string) | undefined
): { base: string; id: string | null } {
  if (!candidateId) return { base: "", id: null };
  const names = getClassNamesForElement(candidateId) ?? [];
  const base = names.find((n) => (getClassType?.(n) ?? "custom") === "custom") ?? "";
  return { base, id: candidateId };
}

function resolveRootBaseFromAncestors(
  elementId: string,
  rootId: string | null,
  initial: { base: string; id: string | null },
  getAncestorIds: (id: string) => string[] | undefined,
  getClassNamesForElement: (id: string) => string[] | undefined,
  getClassType: ((name: string) => string) | undefined,
  parseClass: (name: string) => unknown
): { base: string; id: string | null } {
  if (rootId && initial.base) return initial;

  const ancestorIds = getAncestorIds(elementId) ?? [];
  for (const aid of ancestorIds) {
    const picked = pickRootBaseClass(aid, getClassNamesForElement, getClassType);
    if (!picked.base) continue;
    const parsed = (parseClass(picked.base) as ParsedClass | null) ?? null;
    if (parsed?.kind === "custom" && parsed?.componentKey) {
      return picked;
    }
  }
  return initial;
}

function buildKeyMismatchMessage(
  baseChildName: string,
  rootBaseInfo: { base: string },
  childKey: string | null,
  rootKey: string | null,
  isSingleTokenRoot: boolean,
  childKeyParts: string[],
  parsedChild: ParsedClass | null,
  grammarElementSeparator: string | undefined
): string {
  const elemSep = grammarElementSeparator ?? "_";
  const isCFStyle = elemSep === "-";

  if (!childKey) {
    return isCFStyle
      ? `Could not extract component key from "${baseChildName}". Use "<folder>_<element>${elemSep}wrap".`
      : `Could not extract component key from "${baseChildName}". Use "<name>_<variant>_<group>_wrap".`;
  }
  if (!rootKey) {
    return isCFStyle
      ? `Could not extract component key from root "${rootBaseInfo.base}". Use "<folder>_wrap".`
      : `Could not extract component key from root "${rootBaseInfo.base}". Use "<name>_<variant>_wrap".`;
  }
  if (isSingleTokenRoot && childKeyParts[0] === rootKey && childKeyParts.length >= 2) {
    return `Child group key "${childKey}" introduces a variant but root key "${rootKey}" has none. Prefer "${rootKey}_${parsedChild?.elementToken ?? "[element]"}".`;
  }
  return `Child group key "${childKey}" does not match root key "${rootKey}". Rename to "${rootKey}_[element]${elemSep}wrap".`;
}

function childGroupKeyRuleShortCircuit(args: ElementAnalysisArgs): RuleResult[] | undefined {
  const { elementId, getRoleForElement, parseClass, getAncestorIds, getClassNamesForElement } = args;
  if (!elementId || !getRoleForElement) return [];
  const role: ElementRole = getRoleForElement(elementId) ?? "unknown";
  if (role !== "childGroup") return [];
  if (!parseClass || !getAncestorIds || !getClassNamesForElement) return [];
  return undefined;
}

function violationWhenNoComponentRootAncestor(args: ElementAnalysisArgs): RuleResult[] | undefined {
  const { elementId, classes, getRoleForElement } = args;
  const getAncestorIds = args.getAncestorIds as NonNullable<ElementAnalysisArgs["getAncestorIds"]>;
  const getRole = getRoleForElement as NonNullable<ElementAnalysisArgs["getRoleForElement"]>;
  const rootId = (getAncestorIds(elementId) ?? []).find((id) => getRole(id) === "componentRoot") ?? null;
  if (rootId) return undefined;

  const first = classes?.[0];
  return [
    {
      ruleId: "canonical:childgroup-key-match",
      name: "Child group key must match its nearest component root",
      message: "Child group has no component root ancestor (check structural detection).",
      severity: "error",
      elementId,
      className: first?.className ?? "",
      isCombo: !!first?.isCombo,
    },
  ];
}

function grammarSuggestsChildGroupRole(parsedChild: ParsedClass | null, ancestorIds: string[]): boolean {
  const lastToken = parsedChild?.elementToken?.toLowerCase?.();
  const tokenCount = (parsedChild?.tokens ?? []).length;
  return (
    parsedChild?.kind === "custom" &&
    tokenCount >= 3 &&
    lastToken !== "wrap" &&
    lastToken !== "wrapper" &&
    ancestorIds.length > 0
  );
}

function childGroupKeyMismatchResult(
  elementId: string,
  baseChildName: string,
  rootBaseInfo: { base: string },
  childKey: string | null,
  rootKey: string | null,
  isSingleTokenRoot: boolean,
  childKeyParts: string[],
  parsedChild: ParsedClass | null,
  grammarElementSeparator: string | undefined
): RuleResult[] {
  const msg = buildKeyMismatchMessage(
    baseChildName ?? "",
    rootBaseInfo,
    childKey,
    rootKey,
    isSingleTokenRoot,
    childKeyParts,
    parsedChild,
    grammarElementSeparator
  );

  return [
    {
      ruleId: "canonical:childgroup-key-match",
      name: "Child group key must match its nearest component root",
      message: msg,
      severity: "error",
      elementId,
      className: baseChildName ?? "",
      isCombo: false,
    },
  ];
}

function resolveChildGroupKeysForComparison(
  elementId: string,
  classes: ElementAnalysisArgs["classes"],
  rootId: string,
  getAncestorIds: NonNullable<ElementAnalysisArgs["getAncestorIds"]>,
  parseClass: NonNullable<ElementAnalysisArgs["parseClass"]>,
  getClassType: ElementAnalysisArgs["getClassType"],
  getClassNamesForElement: NonNullable<ElementAnalysisArgs["getClassNamesForElement"]>
):
  | {
      baseChildName: string;
      parsedChild: ParsedClass | null;
      childKey: string | null;
      rootBaseInfo: { base: string; id: string | null };
      rootKey: string | null;
    }
  | undefined {
  const baseChildName = pickBaseCustomClassName(elementId, classes, getClassNamesForElement, getClassType, parseClass);
  if (!baseChildName) return undefined;

  const parsedChild = (parseClass(baseChildName ?? "") as ParsedClass | null) ?? null;
  const childKey = parsedChild?.componentKey ?? null;

  let rootBaseInfo = pickRootBaseClass(rootId, getClassNamesForElement, getClassType);
  rootBaseInfo = resolveRootBaseFromAncestors(
    elementId,
    rootId,
    rootBaseInfo,
    getAncestorIds,
    getClassNamesForElement,
    getClassType,
    parseClass
  );

  const parsedRoot = (parseClass(rootBaseInfo.base) as ParsedClass | null) ?? null;
  const rootKey = parsedRoot?.componentKey ?? null;

  return { baseChildName, parsedChild, childKey, rootBaseInfo, rootKey };
}

function evaluateChildGroupKeyMismatch(args: ElementAnalysisArgs, rootId: string): RuleResult[] {
  const {
    elementId,
    classes,
    getRoleForElement,
    getAncestorIds,
    parseClass,
    getClassType,
    getClassNamesForElement,
    grammarElementSeparator,
  } = args;

  const role: ElementRole = getRoleForElement?.(elementId) ?? "unknown";

  const keys = resolveChildGroupKeysForComparison(
    elementId,
    classes,
    rootId,
    getAncestorIds as NonNullable<ElementAnalysisArgs["getAncestorIds"]>,
    parseClass as NonNullable<ElementAnalysisArgs["parseClass"]>,
    getClassType,
    getClassNamesForElement as NonNullable<ElementAnalysisArgs["getClassNamesForElement"]>
  );
  if (!keys) return [];

  const { baseChildName, parsedChild, childKey, rootBaseInfo, rootKey } = keys;

  const rootParts = (rootKey ?? "").split("_").filter(Boolean);
  const isSingleTokenRoot = rootParts.length === 1;

  const childKeyParts = (childKey ?? "").split("_").filter(Boolean);
  const childExtendsAllowedSingleTokenRoot =
    !!childKey &&
    !!rootKey &&
    isSingleTokenRoot &&
    childKeyParts.length >= 2 &&
    childKeyParts[0] === rootKey &&
    !parsedChild?.variation;

  const ancestorIds = (getAncestorIds as NonNullable<ElementAnalysisArgs["getAncestorIds"]>)(elementId) ?? [];
  const grammarHint = grammarSuggestsChildGroupRole(parsedChild, ancestorIds);
  const shouldEnforce = role === "childGroup" || grammarHint;

  if (shouldEnforce && (!childKey || !rootKey || (childKey !== rootKey && !childExtendsAllowedSingleTokenRoot))) {
    return childGroupKeyMismatchResult(
      elementId,
      baseChildName,
      rootBaseInfo,
      childKey,
      rootKey,
      isSingleTokenRoot,
      childKeyParts,
      parsedChild,
      grammarElementSeparator
    );
  }

  return [];
}

function runChildGroupKeyMatchAnalysis(args: ElementAnalysisArgs): RuleResult[] {
  const short = childGroupKeyRuleShortCircuit(args);
  if (short !== undefined) return short;

  const noRoot = violationWhenNoComponentRootAncestor(args);
  if (noRoot) return noRoot;

  const getAncestorIds = args.getAncestorIds as NonNullable<ElementAnalysisArgs["getAncestorIds"]>;
  const getRoleForElement = args.getRoleForElement as NonNullable<ElementAnalysisArgs["getRoleForElement"]>;
  const rootId = (getAncestorIds(args.elementId) ?? []).find((id) => getRoleForElement(id) === "componentRoot") ?? "";
  if (!rootId) return [];

  return evaluateChildGroupKeyMismatch(args, rootId);
}

/**
 * Child group component key must match nearest component root.
 * - Runs ONLY for elements detected as `childGroup`.
 * - Compares `componentKey` from child vs nearest ancestor with role `componentRoot`.
 */
export const createChildGroupKeyMatchRule = (): Rule => ({
  id: "canonical:childgroup-key-match",
  name: "Child group key must match its nearest component root",
  description:
    "Child groups must share the same component key (name_variant) as their nearest component root ancestor.",
  example: "hero_primary_wrap → hero_primary_cta_wrap",
  category: "structure",
  type: "structure",
  severity: "error",
  enabled: true,

  analyzeElement: runChildGroupKeyMatchAnalysis,
});
