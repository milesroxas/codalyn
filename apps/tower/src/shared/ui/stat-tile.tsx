import Link from "next/link";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/shared/ui/card";

type StatTileTone = "default" | "warn" | "positive";

type StatTileProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: StatTileTone;
  href?: string;
};

function toneIconClass(tone: StatTileTone): string {
  if (tone === "warn") {
    return "flex size-7 items-center justify-center rounded-md bg-destructive/10 text-destructive";
  }
  if (tone === "positive") {
    return "flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary";
  }
  return "flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground";
}

function StatTileContent({ label, value, hint, icon: Icon, tone = "default" }: StatTileProps) {
  return (
    <Card size="sm" className="h-full">
      <CardHeader>
        <CardDescription className="text-xs font-medium text-muted-foreground">{label}</CardDescription>
        <CardAction>
          <span className={toneIconClass(tone)}>
            <Icon className="size-4" />
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <span className="line-clamp-2 wrap-break-word text-xl font-semibold leading-tight tracking-tight tabular-nums text-foreground">
          {value}
        </span>
        {hint ? <span className="line-clamp-2 text-xs text-muted-foreground">{hint}</span> : null}
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
        "block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "transition-colors hover:[&_[data-slot=card]]:bg-muted/30"
      )}
    >
      <StatTileContent {...props} />
    </Link>
  );
}

export { StatTile, type StatTileTone };
