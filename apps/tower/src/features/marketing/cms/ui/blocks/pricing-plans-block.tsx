import { Check } from "lucide-react";
import Link from "next/link";

import type { PricingPlansBlock as PricingPlansBlockProps } from "@/payload-types";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

/** Aurora gradient shared by the featured card border and its badge/checks. */
const featuredGradientClassName = "bg-gradient-to-br from-[#EC4899] to-[#8B5CF6]";

/**
 * Pricing plan cards per the Paper "Pricing" design: equal-width cards with a
 * price row, one-line fit statement, CTA, hairline divider, and check-list.
 * The featured plan gets the aurora gradient border and primary CTA; the trust
 * line renders dot-separated above the row.
 */
function PricingPlansBlock({ trustItems, plans }: PricingPlansBlockProps) {
  return (
    <section data-slot="cms-pricing-plans" className="flex flex-col items-center gap-8 py-6">
      {trustItems?.length ? (
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {trustItems.map((item, index) => (
            <span key={item.id ?? item.text} className="flex items-center gap-3">
              {index > 0 ? <span aria-hidden className="size-[3px] rounded-full bg-muted-foreground/60" /> : null}
              {item.text}
            </span>
          ))}
        </p>
      ) : null}
      <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <div
            key={plan.id ?? plan.name}
            className={cn(plan.featured && cn("rounded-2xl p-px", featuredGradientClassName))}
          >
            <div
              className={cn(
                "flex h-full flex-col gap-5 rounded-2xl p-7",
                plan.featured ? "rounded-[15px] bg-card" : "border bg-card"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{plan.name}</p>
                {plan.badge ? (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white uppercase",
                      featuredGradientClassName
                    )}
                  >
                    {plan.badge}
                  </span>
                ) : null}
              </div>
              <p className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                {plan.priceSuffix ? <span className="text-sm text-muted-foreground">{plan.priceSuffix}</span> : null}
              </p>
              {plan.bestFor ? <p className="min-h-10 text-sm text-muted-foreground">{plan.bestFor}</p> : null}
              <Button asChild variant={plan.featured ? "default" : "outline"} className="rounded-full">
                <Link href={plan.cta.href}>{plan.cta.label}</Link>
              </Button>
              <div className="border-t" />
              <ul className="flex flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature.id ?? feature.text} className="flex items-start gap-2.5 text-sm">
                    <Check
                      aria-hidden
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        plan.featured ? "text-[#EC4899]" : "text-muted-foreground"
                      )}
                    />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export { PricingPlansBlock };
