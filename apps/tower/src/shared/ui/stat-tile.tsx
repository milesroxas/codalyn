import { cva } from "class-variance-authority";
import Link from "next/link";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/shared/ui/card";

type StatTileTone = "default" | "warn" | "positive";
type StatTileValueVariant = "status" | "metric";

const statTileIconVariants = cva("flex size-7 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", {
  variants: {
    tone: {
      default: "bg-muted text-muted-foreground",
      warn: "bg-destructive/10 text-destructive",
      positive: "bg-primary/10 text-primary",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const statTileValueVariants = cva("line-clamp-2 wrap-break-word font-semibold tracking-tight text-foreground", {
  variants: {
    kind: {
      status: "text-base leading-snug",
      metric: "text-xl leading-none tabular-nums",
    },
    tone: {
      default: "",
      warn: "",
      positive: "",
    },
  },
  compoundVariants: [
    { kind: "status", tone: "warn", className: "text-destructive" },
    { kind: "status", tone: "positive", className: "text-primary" },
  ],
  defaultVariants: {
    kind: "status",
    tone: "default",
  },
});

type StatTileProps = {
  label: string;
  value: string | number;
  valueVariant?: StatTileValueVariant;
  detail?: string;
  caption?: string;
  /** @deprecated Prefer `caption`. Kept for existing call sites. */
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: StatTileTone;
  href?: string;
};

function resolveValueVariant(value: string | number, valueVariant?: StatTileValueVariant): StatTileValueVariant {
  if (valueVariant) {
    return valueVariant;
  }
  return typeof value === "number" ? "metric" : "status";
}

function StatTileContent({
  label,
  value,
  valueVariant,
  detail,
  caption,
  hint,
  icon: Icon,
  tone = "default",
}: StatTileProps) {
  const resolvedCaption = caption ?? hint;
  const kind = resolveValueVariant(value, valueVariant);

  return (
    <Card size="sm" className="h-full">
      <CardHeader className="pb-0">
        <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </CardDescription>
        <CardAction>
          <span className={statTileIconVariants({ tone })}>
            <Icon aria-hidden />
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className={statTileValueVariants({ kind, tone })}>{value}</p>
        {detail || resolvedCaption ? (
          <div className="flex flex-col gap-1">
            {detail ? <p className="text-sm font-medium leading-snug text-foreground/90">{detail}</p> : null}
            {resolvedCaption ? (
              <p className="text-xs leading-relaxed text-muted-foreground">{resolvedCaption}</p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatTile(props: StatTileProps) {
  const { href } = props;
  if (!href) {
    return <StatTileContent {...props} />;
  }

  return (
    <Link
      href={href}
      className={cn(
        "group/stat-tile block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "transition-colors hover:[&_[data-slot=card]]:bg-muted/30 hover:[&_[data-slot=card]]:ring-foreground/15"
      )}
    >
      <StatTileContent {...props} />
    </Link>
  );
}

export { StatTile, type StatTileTone, type StatTileValueVariant, statTileIconVariants, statTileValueVariants };
