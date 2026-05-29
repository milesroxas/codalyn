import { cva } from "class-variance-authority";
import type { TowerUsageProductFeature } from "../tower/tower-usage-product-feature.js";
import { towerUsageProductFeatureLabel } from "../tower/tower-usage-product-feature.js";

export const tooltipProductBadgeVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center rounded-sm border px-1.5 text-[0.6875rem] font-semibold leading-none",
  {
    variants: {
      product: {
        cmsSlots: "border-violet-300/70 bg-violet-600 text-white",
        imageUpload: "border-emerald-300/70 bg-emerald-600 text-white",
      },
    },
    defaultVariants: {
      product: "cmsSlots",
    },
  }
);

export type TooltipProductBadgeProps = {
  product: TowerUsageProductFeature;
};

export function TooltipProductBadge({ product }: TooltipProductBadgeProps) {
  return (
    <span data-slot="tooltip-product-badge" data-product={product} className={tooltipProductBadgeVariants({ product })}>
      {towerUsageProductFeatureLabel(product)}
    </span>
  );
}
