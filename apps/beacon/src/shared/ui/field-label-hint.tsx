import { cva } from "class-variance-authority";
import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

const fieldLabelHintTriggerVariants = cva(
  "inline-flex shrink-0 cursor-help items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      size: {
        sm: "size-4",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  }
);

const fieldLabelHintContentVariants = cva("max-w-[220px] text-left leading-snug");

type FieldLabelHintProps = {
  /** Used for the trigger's accessible name, e.g. `About Name`. */
  aboutLabel: string;
  children: ReactNode;
};

export function FieldLabelHint(props: FieldLabelHintProps) {
  const { aboutLabel, children } = props;

  return (
    <Tooltip>
      <TooltipTrigger type="button" aria-label={`About ${aboutLabel}`} className={fieldLabelHintTriggerVariants()}>
        <CircleHelp className="size-3.5" aria-hidden />
      </TooltipTrigger>
      <TooltipContent side="top" className={cn(fieldLabelHintContentVariants())}>
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
