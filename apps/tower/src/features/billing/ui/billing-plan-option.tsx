import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/ui/accordion";
import { Badge } from "@/shared/ui/badge";

const billingPlanOptionVariants = cva("flex items-start gap-2 rounded-sm p-3", {
  variants: {
    state: {
      current: "bg-muted/40",
      upgrade: "border border-border",
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
  /** Expandable plan facts, collapsed by default so each row stays a one-line scan. */
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

function BillingPlanOptionDetails(props: { plan: string; details: string[]; detailsLabel: string }) {
  const { plan, details, detailsLabel } = props;
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value={`${plan}-details`}>
        <AccordionTrigger size="sm" aria-label={`${detailsLabel} — ${plan}`}>
          {detailsLabel}
        </AccordionTrigger>
        <AccordionContent>
          <ul
            data-slot="billing-plan-option-details"
            className="space-y-1 text-xs leading-relaxed text-muted-foreground"
          >
            {details.map((detail) => (
              <li key={detail} className="flex gap-2">
                <span aria-hidden className="select-none">
                  •
                </span>
                <span className="min-w-0 flex-1">{detail}</span>
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function BillingPlanOption(props: BillingPlanOptionProps) {
  const { plan, caption, state, action, details, detailsLabel = "What's included" } = props;

  return (
    <div data-slot="billing-plan-option" className={cn(billingPlanOptionVariants({ state }))}>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xl font-semibold tracking-tight text-foreground">{plan}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{caption}</p>
        {details && details.length > 0 ? (
          <BillingPlanOptionDetails plan={plan} details={details} detailsLabel={detailsLabel} />
        ) : null}
      </div>
      {state === "current" ? <Badge variant="outline">Current plan</Badge> : null}
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}

export { BillingPlanOption, BillingPlanOptionsList };
