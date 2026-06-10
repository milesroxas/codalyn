import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

function billingPlanTone(plan: string): "default" | "positive" {
  return plan === "Free" || plan === "Not selected" ? "default" : "positive";
}

function BillingPlanHero(props: { plan: string; caption: string }) {
  const { plan, caption } = props;
  const tone = billingPlanTone(plan);

  return (
    <div className="space-y-1">
      <p
        className={cn("text-xl font-semibold tracking-tight", tone === "positive" ? "text-primary" : "text-foreground")}
      >
        {plan}
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">{caption}</p>
    </div>
  );
}

function BillingPlanHeroRow(props: { plan: string; caption: string; trailing?: ReactNode }) {
  const { plan, caption, trailing } = props;

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <BillingPlanHero plan={plan} caption={caption} />
      </div>
      {trailing}
    </div>
  );
}

export { BillingPlanHero, BillingPlanHeroRow };
