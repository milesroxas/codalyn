import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BEACON_HOME_TILE_CSS_VARS } from "@/shared/lib/beacon-app-backgrounds";
import { cn } from "@/shared/lib/utils";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";

type CmsSlotsHeroEmptyStateProps = {
  "data-slot": string;
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
};

export function CmsSlotsRouteHeroEmptyCenter(props: { "data-slot": string; children: ReactNode }) {
  return (
    <div
      className="flex min-h-[min(40vh,16rem)] flex-col items-center justify-center py-4"
      data-slot={props["data-slot"]}
    >
      <div className="w-full max-w-md">{props.children}</div>
    </div>
  );
}

export function CmsSlotsHeroEmptyState(props: CmsSlotsHeroEmptyStateProps) {
  const { icon: Icon, title, description, "data-slot": dataSlot, className } = props;

  return (
    <Empty
      data-slot={dataSlot}
      className={cn(
        "relative isolate min-h-[min(40vh,14rem)] w-full gap-3 overflow-hidden rounded-lg border-dashed border-border/60 px-6 py-10",
        className
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `var(${BEACON_HOME_TILE_CSS_VARS.cmsSlot})` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/92 via-background/40 to-background/55"
      />
      <EmptyHeader className="relative z-1 gap-2.5">
        <EmptyMedia variant="icon" className="mb-0 size-10 [&_svg:not([class*='size-'])]:size-5">
          <Icon aria-hidden strokeWidth={1.75} />
        </EmptyMedia>
        <EmptyTitle className="text-base text-foreground">{title}</EmptyTitle>
        <EmptyDescription className="max-w-66 text-xs leading-relaxed">{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
