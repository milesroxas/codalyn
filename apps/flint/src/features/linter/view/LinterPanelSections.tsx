import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { RuleResult } from "@/features/linter/model/rule.types";
import { type LintViewMode, ModeToggle } from "@/features/linter/ui/controls/ModeToggle";
import SeverityFilter, { type SeverityFilterValue } from "@/features/linter/ui/controls/SeverityFilter";
import { StructuralContextToggle } from "@/features/linter/ui/controls/StructuralContextToggle";
import { ViolationsList } from "@/features/linter/ui/violations/ViolationsList";
import { trackModeSwitched, trackSeverityFilterChanged } from "@/shared/lib/analytics";
import { cn } from "@/shared/utils";

export function LinterPanelStatusRows(props: {
  error: string | null;
  loading: boolean;
  hasRun: boolean;
  count: number;
  mode: LintViewMode;
}) {
  const { error, loading, hasRun, count, mode } = props;
  return (
    <>
      {error && (
        <div className="flex items-center gap-2 py-2 text-sm text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}
      {!error && !loading && hasRun && count === 0 && mode === "page" && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-3 w-3" />
          No issues found
        </div>
      )}
    </>
  );
}

export function LinterModeHeader(props: {
  mode: LintViewMode;
  setMode: (m: LintViewMode) => void;
  hideModeToggle: boolean;
  structuralContext: boolean;
  setStructuralContext: (v: boolean) => void;
}) {
  const { mode, setMode, hideModeToggle, structuralContext, setStructuralContext } = props;
  return (
    <div
      className={cn(
        "pt-4 transition-[opacity,transform,height,margin] duration-300 ease-gentle will-change-[opacity,transform]",
        hideModeToggle ? "opacity-0 -translate-y-2 h-0 -mb-2" : "opacity-100 translate-y-0 h-auto mb-4"
      )}
    >
      <div className="flex gap-3 items-center justify-between">
        <ModeToggle
          mode={mode}
          onChange={(next) => {
            trackModeSwitched({ from_mode: mode, to_mode: next });
            setMode(next);
          }}
        />
        {mode === "element" && (
          <div className="flex pr-2 items-center gap-2">
            <StructuralContextToggle enabled={structuralContext} onChange={setStructuralContext} />
          </div>
        )}
      </div>
    </div>
  );
}

export function LinterViolationsSection(props: {
  mode: LintViewMode;
  loading: boolean;
  hasRun: boolean;
  severityFilter: SeverityFilterValue;
  setSeverityFilter: (v: SeverityFilterValue) => void;
  filtersCondensed: boolean;
  setFiltersCondensed: (v: boolean) => void;
  setHideModeToggle: (v: boolean) => void;
  filteredViolations: RuleResult[];
  activePassedClassNames: string[];
  activeIgnoredClassNames: string[];
  errorCount: number;
  warningCount: number;
  suggestionCount: number;
  structuralContext: boolean;
}) {
  const {
    mode,
    loading,
    hasRun,
    severityFilter,
    setSeverityFilter,
    filtersCondensed,
    setFiltersCondensed,
    setHideModeToggle,
    filteredViolations,
    activePassedClassNames,
    activeIgnoredClassNames,
    errorCount,
    warningCount,
    suggestionCount,
    structuralContext,
  } = props;

  if (mode === "page" && !loading && !hasRun) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
        <AlertCircle className="h-3 w-3" />
        Click the button to lint this page
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {mode === "page" && (
        <div className="pr-4 sticky top-0 z-10 bg-gradient-to-b from-background to-transparent w-full">
          <SeverityFilter
            filter={severityFilter}
            counts={{
              error: errorCount,
              warning: warningCount,
              suggestion: suggestionCount,
            }}
            onChange={(next) => {
              trackSeverityFilterChanged({ filter: next });
              setSeverityFilter(next);
            }}
            condensed={filtersCondensed}
          />
        </div>
      )}
      <div className="min-h-0 flex-1">
        <ViolationsList
          violations={filteredViolations}
          passedClassNames={activePassedClassNames}
          ignoredClassNames={activeIgnoredClassNames}
          showHighlight={mode === "page" || (mode === "element" && structuralContext)}
          bypassAnimation={mode === "element"}
          onScrollStateChange={mode === "page" ? setFiltersCondensed : undefined}
          onScrollDirectionChange={
            mode === "page"
              ? (dir) => {
                  setHideModeToggle(dir === "down");
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
