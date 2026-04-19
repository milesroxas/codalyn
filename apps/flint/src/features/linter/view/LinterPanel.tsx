import { useEffect, useMemo, useState } from "react";
import type { RuleResult } from "@/features/linter/model/rule.types";
import { useElementLint } from "@/features/linter/store/elementLint.store";
import { usePageLint } from "@/features/linter/store/pageLint.store";
import type { LintViewMode } from "@/features/linter/ui/controls/ModeToggle";
import type { SeverityFilterValue } from "@/features/linter/ui/controls/SeverityFilter";
import { LinterPanelBody } from "@/features/linter/view/LinterPanelBody";

export function LinterPanel() {
  const {
    results,
    passedClassNames,
    ignoredClassNames: pageIgnoredClassNames,
    loading,
    error,
    hasRun,
    lintPage,
  } = usePageLint();
  // const opinionMode: "strict" | "balanced" | "lenient" = "balanced";
  const count = results.length;
  const [mode, setMode] = useState<LintViewMode>("element");

  // Track mode internally without noisy logging
  useEffect(() => {
    void mode;
  }, [mode]);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilterValue>("all");
  const [filtersCondensed, setFiltersCondensed] = useState(false);
  const [hideModeToggle, setHideModeToggle] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  // Ensure element mode never auto-hides the mode toggle.
  useEffect(() => {
    if (mode !== "page") {
      setHideModeToggle(false);
    }
  }, [mode]);

  // Panel entrance animation
  useEffect(() => {
    setIsPanelVisible(true);
  }, []);

  const {
    results: elementResults,
    classNames: elementClassNames,
    ignoredClassNames: elementIgnoredClassNames,
    loading: elementLoading,
    refresh: refreshElementLint,
    structuralContext,
    setStructuralContext,
  } = useElementLint();

  // Auto-enter/exit is handled centrally in the store's selection subscription

  const activeViolations: RuleResult[] = useMemo(
    () => (mode === "page" ? results : elementResults),
    [mode, results, elementResults]
  );
  const filteredViolations: RuleResult[] = useMemo(() => {
    if (mode !== "page") return activeViolations;
    if (severityFilter === "all") return activeViolations;
    return activeViolations.filter((v) => v.severity === severityFilter);
  }, [mode, activeViolations, severityFilter]);
  const activePassedClassNames: string[] = useMemo(
    () => (mode === "page" ? passedClassNames : elementClassNames),
    [mode, passedClassNames, elementClassNames]
  );
  const activeIgnoredClassNames: string[] = useMemo(
    () => (mode === "page" ? pageIgnoredClassNames : elementIgnoredClassNames),
    [mode, pageIgnoredClassNames, elementIgnoredClassNames]
  );
  const isBusy = mode === "page" ? loading : elementLoading;

  const errorCount = useMemo(
    () => (mode === "page" ? results.filter((v) => v.severity === "error").length : 0),
    [mode, results]
  );
  const warningCount = useMemo(
    () => (mode === "page" ? results.filter((v) => v.severity === "warning").length : 0),
    [mode, results]
  );
  const suggestionCount = useMemo(
    () => (mode === "page" ? results.filter((v) => v.severity === "suggestion").length : 0),
    [mode, results]
  );

  // ESC handling moved to store to avoid duplicates

  return (
    <LinterPanelBody
      error={error}
      loading={loading}
      hasRun={hasRun}
      count={count}
      mode={mode}
      setMode={setMode}
      severityFilter={severityFilter}
      setSeverityFilter={setSeverityFilter}
      filtersCondensed={filtersCondensed}
      setFiltersCondensed={setFiltersCondensed}
      hideModeToggle={hideModeToggle}
      setHideModeToggle={setHideModeToggle}
      isPanelVisible={isPanelVisible}
      filteredViolations={filteredViolations}
      activePassedClassNames={activePassedClassNames}
      activeIgnoredClassNames={activeIgnoredClassNames}
      errorCount={errorCount}
      warningCount={warningCount}
      suggestionCount={suggestionCount}
      structuralContext={structuralContext}
      setStructuralContext={setStructuralContext}
      isBusy={isBusy}
      activeViolations={activeViolations}
      lintPage={lintPage}
      refreshElementLint={refreshElementLint}
    />
  );
}
