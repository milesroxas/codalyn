import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type BeaconRouteLoadingShellProps = {
  ariaLabel: string;
  className?: string;
  dataSlot?: string;
};

/** Centered loader body for route scroll regions (pair with overlay or content transition). */
export function BeaconRouteLoadingShell(props: BeaconRouteLoadingShellProps) {
  const { ariaLabel, className, dataSlot = "beacon_route_loading_shell" } = props;

  return (
    <div
      className={cn("flex min-h-[min(40vh,16rem)] flex-1 flex-col items-center justify-center py-4", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-slot={dataSlot}
    >
      <Loader2 aria-hidden className="size-6 shrink-0 animate-spin text-muted-foreground" />
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}
