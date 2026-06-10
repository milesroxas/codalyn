import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { MarketingFeaturePanelShader } from "@/shared/ui/marketing-feature-panel-shader";
import type { MarketingFeaturePanelAccent } from "@/shared/ui/marketing-shader-presets";

const marketingFeaturePanelVariants = cva(
  "relative flex w-full shrink-0 flex-col gap-8 overflow-hidden rounded-[10px] p-8 lg:w-[32rem] lg:max-w-[32rem]",
  {
    variants: {
      accent: {
        magenta: "bg-black",
        violet: "bg-black",
      },
    },
    defaultVariants: {
      accent: "magenta",
    },
  }
);

const marketingFeatureIconVariants = cva(
  "relative flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-neutral-950 shadow-sm drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] [&_svg]:size-5 [&_svg]:text-white"
);

type MarketingFeaturePanelProps = React.ComponentProps<"article"> &
  VariantProps<typeof marketingFeaturePanelVariants> & {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
  };

function MarketingFeaturePanel({ accent, icon, title, children, className, ...props }: MarketingFeaturePanelProps) {
  const resolvedAccent: MarketingFeaturePanelAccent = accent ?? "magenta";

  return (
    <article
      data-slot="marketing-feature-panel"
      className={cn(marketingFeaturePanelVariants({ accent: resolvedAccent }), className)}
      {...props}
    >
      <MarketingFeaturePanelShader accent={resolvedAccent} />
      <div className="relative flex flex-col gap-8">
        <div className="flex flex-col gap-6">
          <div className={marketingFeatureIconVariants()}>{icon}</div>
          <h2 className="text-4xl font-semibold tracking-tight text-neutral-50">{title}</h2>
        </div>
        {children}
      </div>
    </article>
  );
}

type MarketingFeatureRoleSectionProps = {
  label: string;
  steps: readonly string[];
};

function MarketingFeatureRoleSection({ label, steps }: MarketingFeatureRoleSectionProps) {
  return (
    <div data-slot="marketing-feature-role" className="flex flex-col gap-4">
      <p className="text-base font-bold text-neutral-400">{label}</p>
      <ul className="flex flex-col gap-4">
        {steps.map((step) => (
          <li key={step} className="text-[21px] leading-6 text-neutral-400">
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}

export { MarketingFeaturePanel, MarketingFeatureRoleSection, marketingFeatureIconVariants };
