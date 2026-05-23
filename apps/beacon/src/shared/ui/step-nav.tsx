import { cva } from "class-variance-authority";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

export type StepNavItem<T extends string = string> = {
  id: T;
  label: ReactNode;
  /** Shown on past interactive steps before navigating back. */
  restartHint?: string;
};

export type StepNavProps<T extends string = string> = {
  "aria-label": string;
  steps: StepNavItem<T>[];
  current: T;
  onStepSelect?: (step: T) => void;
};

const stepNavLabelVariants = cva("inline-flex h-7 min-w-0 items-center px-1.5 text-[11px] underline-offset-2", {
  variants: {
    state: {
      current: "font-semibold text-foreground",
      past: "text-muted-foreground",
      upcoming: "text-muted-foreground/50 opacity-80",
    },
  },
  defaultVariants: {
    state: "past",
  },
});

const stepNavRootClass = "min-w-0";
const stepNavListClass = "flex flex-wrap items-center gap-0.5 text-[11px]";
const stepNavItemClass = "flex min-w-0 items-center gap-0.5";
const stepNavSeparatorClass = "size-3 shrink-0 text-muted-foreground/70";

type StepNavState = "current" | "past" | "upcoming";

function stepNavButtonVariant(state: StepNavState): "stepNavCurrent" | "stepNavPast" | "stepNavUpcoming" {
  if (state === "current") {
    return "stepNavCurrent";
  }
  if (state === "upcoming") {
    return "stepNavUpcoming";
  }
  return "stepNavPast";
}

function StepNavLabel(props: { label: ReactNode; state: StepNavState }) {
  const { label, state } = props;
  return <span className={stepNavLabelVariants({ state })}>{label}</span>;
}

function StepNavInteractiveItem<T extends string>(props: {
  step: StepNavItem<T>;
  state: StepNavState;
  onStepSelect: (step: T) => void;
}) {
  const { step, state, onStepSelect } = props;
  const label = step.label;
  const button = (
    <Button
      type="button"
      variant={stepNavButtonVariant(state)}
      size="stepNav"
      disabled={state !== "past"}
      onClick={state === "past" ? () => onStepSelect(step.id) : undefined}
    >
      {label}
    </Button>
  );

  if (state === "past" && step.restartHint) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{button}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[16rem] text-xs">
          {step.restartHint}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

export function StepNav<T extends string = string>(props: StepNavProps<T>) {
  const { "aria-label": ariaLabel, steps, current, onStepSelect } = props;
  if (steps.length === 0) {
    return null;
  }

  const activeIdx = steps.findIndex((step) => step.id === current);
  const interactive = onStepSelect != null;

  return (
    <nav aria-label={ariaLabel} className={stepNavRootClass} data-slot="step_nav">
      <ol className={stepNavListClass}>
        {steps.map((step, index) => {
          const state: StepNavState = step.id === current ? "current" : index < activeIdx ? "past" : "upcoming";

          return (
            <li key={step.id} className={stepNavItemClass}>
              {index > 0 ? <ChevronRight aria-hidden className={stepNavSeparatorClass} /> : null}
              {interactive ? (
                <StepNavInteractiveItem step={step} state={state} onStepSelect={onStepSelect} />
              ) : (
                <StepNavLabel label={step.label} state={state} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** True when a route subheader should render (non-empty step nav or other subheader content). */
export function hasBeaconRouteSubheaderContent(subheader: ReactNode | null | undefined): subheader is ReactNode {
  if (subheader == null || subheader === false) {
    return false;
  }
  if (Array.isArray(subheader)) {
    return subheader.some((child) => child != null && child !== false);
  }
  return true;
}
