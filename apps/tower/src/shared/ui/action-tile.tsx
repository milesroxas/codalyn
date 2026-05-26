import { IconArrowRight } from "@tabler/icons-react";
import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import { Children, type ComponentProps, type ComponentType } from "react";

import { cn } from "@/shared/lib/utils";

const actionTileVariants = cva(
  "group/action-tile relative flex h-full flex-col gap-3 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default: "hover:bg-muted/30 hover:ring-foreground/15",
        emphasis: "bg-primary/5 ring-primary/20 hover:bg-primary/10 hover:ring-primary/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const actionTileIconVariants = cva("flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px]", {
  variants: {
    variant: {
      default:
        "bg-muted text-muted-foreground group-hover/action-tile:bg-muted/80 group-hover/action-tile:text-foreground",
      emphasis: "bg-primary/10 text-primary group-hover/action-tile:bg-primary/15",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type ActionTileProps = {
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
} & VariantProps<typeof actionTileVariants>;

function ActionTile({ label, description, icon: Icon, href, variant = "default" }: ActionTileProps) {
  return (
    <Link href={href} className={cn(actionTileVariants({ variant }))}>
      <div className="flex items-start justify-between gap-3">
        <span className={actionTileIconVariants({ variant })}>
          <Icon aria-hidden />
        </span>
        <IconArrowRight
          aria-hidden
          className="size-4 shrink-0 translate-x-0 text-muted-foreground/60 transition-transform group-hover/action-tile:translate-x-0.5 group-hover/action-tile:text-foreground"
        />
      </div>
      <div className="space-y-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </div>
    </Link>
  );
}

function ActionTileGrid({ className, children, ...props }: ComponentProps<"div">) {
  const columns = Children.count(children) === 3 ? 3 : 2;

  return (
    <div className={cn("grid gap-3", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2", className)} {...props}>
      {children}
    </div>
  );
}

export { ActionTile, ActionTileGrid, actionTileIconVariants, actionTileVariants };
