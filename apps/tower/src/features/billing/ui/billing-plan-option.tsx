import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipDetailHeading,
  TooltipDetailList,
  TooltipDetailListItem,
  TooltipDetailSection,
  TooltipHelpTrigger,
} from "@/shared/ui/tooltip";

const billingPlanOptionVariants = cva("flex items-start gap-2 rounded-sm p-3", {
  variants: {
    state: {
      current: "bg-muted/40",
      upgrade: "border border-border",
      downgrade: "border border-dashed border-border",
    },
  },
  defaultVariants: {
    state: "upgrade",
  },
});

type BillingPlanOptionProps = {
  plan: string;
  caption: string;
  state: NonNullable<VariantProps<typeof billingPlanOptionVariants>["state"]>;
  action?: ReactNode;
  /** Plan facts shown in a help tooltip next to the plan name, so each row stays a one-line scan. */
  details?: string[];
  detailsLabel?: string;
};

function BillingPlanOptionsList({ children }: { children: ReactNode }) {
  return (
    <div data-slot="billing-plan-options" className="flex flex-col gap-3 py-3">
      {children}
    </div>
  );
}

function BillingPlanOptionDetailsTooltip(props: { plan: string; details: string[]; detailsLabel: string }) {
  const { plan, details, detailsLabel } = props;
  return (
    <Tooltip>
      <TooltipHelpTrigger label={`${detailsLabel} — ${plan}`} />
      <TooltipContent variant="detail">
        <TooltipDetailSection>
          <TooltipDetailHeading>{detailsLabel}</TooltipDetailHeading>
          <TooltipDetailList>
            {details.map((detail) => (
              <TooltipDetailListItem key={detail} detail={detail} />
            ))}
          </TooltipDetailList>
        </TooltipDetailSection>
      </TooltipContent>
    </Tooltip>
  );
}

function BillingPlanOption(props: BillingPlanOptionProps) {
  const { plan, caption, state, action, details, detailsLabel = "What's included" } = props;

  return (
    <div data-slot="billing-plan-option" className={cn(billingPlanOptionVariants({ state }))}>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5">
          <p className="text-xl font-semibold tracking-tight text-foreground">{plan}</p>
          {details && details.length > 0 ? (
            <BillingPlanOptionDetailsTooltip plan={plan} details={details} detailsLabel={detailsLabel} />
          ) : null}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{caption}</p>
      </div>
      {state === "current" ? <Badge variant="outline">Current plan</Badge> : null}
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}

export { BillingPlanOption, BillingPlanOptionsList };
