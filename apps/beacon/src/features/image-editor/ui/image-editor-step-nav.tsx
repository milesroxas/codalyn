import { ChevronRight } from "lucide-react";
import {
  getImageEditorNavSteps,
  type ImageEditorFlowStep,
  type ImageEditorPathMode,
} from "@/features/image-editor/lib/image-editor-flow-step";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

type ImageEditorStepNavProps = {
  pathMode: ImageEditorPathMode;
  includeEntryStep: boolean;
  current: ImageEditorFlowStep;
  onGoToStep: (step: ImageEditorFlowStep) => void;
  hasImage: boolean;
  className?: string;
};

function stepIndex(steps: { id: ImageEditorFlowStep }[], step: ImageEditorFlowStep): number {
  return steps.findIndex((s) => s.id === step);
}

export function ImageEditorStepNav(props: ImageEditorStepNavProps) {
  const { pathMode, includeEntryStep, current, onGoToStep, hasImage, className } = props;
  const steps = getImageEditorNavSteps(pathMode, { includeEntryStep });
  if (pathMode === "unset" || steps.length === 0) {
    return null;
  }

  const activeIdx = stepIndex(steps, current);

  return (
    <nav aria-label="Image editor steps" className={cn("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-0.5 text-[11px]">
        {steps.map((s, i) => {
          const isCurrent = s.id === current;
          const isPast = i < activeIdx;
          const isUpcoming = i > activeIdx;
          const canClick = isPast;
          const sizeOrTargetWithImageHint =
            (s.id === "autoElement" || s.id === "configurePresets") && hasImage && isPast;
          return (
            <li key={s.id} className="flex min-w-0 items-center gap-0.5">
              {i > 0 ? <ChevronRight aria-hidden className="size-3 shrink-0 text-muted-foreground/70" /> : null}
              {sizeOrTargetWithImageHint ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-7 min-w-0 px-1.5 text-[11px] text-muted-foreground"
                        onClick={() => onGoToStep(s.id)}
                      >
                        {s.label}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[16rem] text-xs">
                    Restarts this step — you will add your image file again.
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  disabled={!canClick}
                  onClick={canClick ? () => onGoToStep(s.id) : undefined}
                  className={cn(
                    "h-7 min-w-0 px-1.5 text-[11px] underline-offset-2",
                    isCurrent && "text-foreground font-semibold no-underline",
                    isUpcoming && "pointer-events-none text-muted-foreground/50 opacity-80",
                    canClick && "text-muted-foreground"
                  )}
                >
                  {s.label}
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
