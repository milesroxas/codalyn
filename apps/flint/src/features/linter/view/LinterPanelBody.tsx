import type { RuleResult } from "@/features/linter/model/rule.types";
import { ActionBar } from "@/features/linter/ui/controls/ActionBar";
import { FeedbackFab } from "@/features/linter/ui/controls/FeedbackFab";
import type { LintViewMode } from "@/features/linter/ui/controls/ModeToggle";
import type { SeverityFilterValue } from "@/features/linter/ui/controls/SeverityFilter";
import {
  LinterModeHeader,
  LinterPanelStatusRows,
  LinterViolationsSection,
} from "@/features/linter/view/LinterPanelSections";
import { cn } from "@/shared/utils";

export interface LinterPanelBodyProps {
  error: string | null;
  loading: boolean;
  hasRun: boolean;
  count: number;
  mode: LintViewMode;
  setMode: (m: LintViewMode) => void;
  severityFilter: SeverityFilterValue;
  setSeverityFilter: (v: SeverityFilterValue) => void;
  filtersCondensed: boolean;
  setFiltersCondensed: (v: boolean) => void;
  hideModeToggle: boolean;
  setHideModeToggle: (v: boolean) => void;
  isPanelVisible: boolean;
  filteredViolations: RuleResult[];
  activePassedClassNames: string[];
  activeIgnoredClassNames: string[];
  errorCount: number;
  warningCount: number;
  suggestionCount: number;
  structuralContext: boolean;
  setStructuralContext: (v: boolean) => void;
  isBusy: boolean;
  activeViolations: RuleResult[];
  lintPage: () => Promise<void>;
  refreshElementLint: () => Promise<void>;
}

export function LinterPanelBody(props: LinterPanelBodyProps) {
  const {
    error,
    loading,
    hasRun,
    count,
    mode,
    setMode,
    severityFilter,
    setSeverityFilter,
    filtersCondensed,
    setFiltersCondensed,
    hideModeToggle,
    setHideModeToggle,
    isPanelVisible,
    filteredViolations,
    activePassedClassNames,
    activeIgnoredClassNames,
    errorCount,
    warningCount,
    suggestionCount,
    structuralContext,
    setStructuralContext,
    isBusy,
    activeViolations,
    lintPage,
    refreshElementLint,
  } = props;

  return (
    <section
      className={cn(
        "relative h-full flex flex-col transition-all duration-700 ease-spring",
        isPanelVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
    >
      <div className="pl-4 pr-0 flex-1 min-h-0 flex flex-col">
        <LinterPanelStatusRows error={error} loading={loading} hasRun={hasRun} count={count} mode={mode} />
        {!error && (
          <div className="flex min-h-0 flex-1 flex-col">
            <LinterModeHeader
              mode={mode}
              setMode={setMode}
              hideModeToggle={hideModeToggle}
              structuralContext={structuralContext}
              setStructuralContext={setStructuralContext}
            />
            <LinterViolationsSection
              mode={mode}
              loading={loading}
              hasRun={hasRun}
              severityFilter={severityFilter}
              setSeverityFilter={setSeverityFilter}
              filtersCondensed={filtersCondensed}
              setFiltersCondensed={setFiltersCondensed}
              setHideModeToggle={setHideModeToggle}
              filteredViolations={filteredViolations}
              activePassedClassNames={activePassedClassNames}
              activeIgnoredClassNames={activeIgnoredClassNames}
              errorCount={errorCount}
              warningCount={warningCount}
              suggestionCount={suggestionCount}
              structuralContext={structuralContext}
            />
          </div>
        )}
      </div>
      <FeedbackFab className="absolute bottom-16 right-4 z-20" />
      <ActionBar
        loading={isBusy}
        mode={mode}
        issueCount={activeViolations.length}
        hasRun={mode === "page" ? hasRun : false}
        onLint={async () => {
          if (mode === "page") {
            await lintPage();
          } else {
            await refreshElementLint();
          }
        }}
      />
    </section>
  );
}
