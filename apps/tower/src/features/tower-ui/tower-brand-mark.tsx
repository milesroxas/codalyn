import { cva, type VariantProps } from "class-variance-authority";
import { TowerControlIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";

const towerBrandMarkVariants = cva("flex shrink-0 items-center justify-center bg-primary text-primary-foreground", {
  variants: {
    size: {
      header: "size-5 rounded-md [&_svg]:size-3",
      default: "size-8 rounded-lg [&_svg]:size-4",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export function TowerBrandMark({
  className,
  size,
}: {
  className?: string;
} & VariantProps<typeof towerBrandMarkVariants>) {
  return (
    <span className={cn(towerBrandMarkVariants({ size }), className)} aria-hidden>
      <TowerControlIcon />
    </span>
  );
}
