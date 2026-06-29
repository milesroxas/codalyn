import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
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
};

function BillingPlanOptionsList({ children }: { children: ReactNode }) {
  return (
    <div data-slot="billing-plan-options" className="flex flex-col gap-3 py-3">
      {children}
    </div>
  );
}

function BillingPlanOption(props: BillingPlanOptionProps) {
  const { plan, caption, state, action } = props;

  return (
    <div data-slot="billing-plan-option" className={cn(billingPlanOptionVariants({ state }))}>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xl font-semibold tracking-tight text-foreground">{plan}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{caption}</p>
      </div>
      {state === "current" ? <Badge variant="outline">Current plan</Badge> : null}
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}

export { BillingPlanOption, BillingPlanOptionsList };
