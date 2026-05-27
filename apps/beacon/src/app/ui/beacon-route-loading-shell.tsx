import { BeaconRouteLoadingStatus } from "@/app/ui/beacon-route-loading-status";
import { cn } from "@/shared/lib/utils";

type BeaconRouteLoadingShellProps = {
  ariaLabel: string;
  message?: string;
  className?: string;
  dataSlot?: string;
};

/** Centered loader body for route scroll regions (pair with overlay or content transition). */
export function BeaconRouteLoadingShell(props: BeaconRouteLoadingShellProps) {
  const { ariaLabel, message, className, dataSlot = "beacon_route_loading_shell" } = props;

  return (
    <div
      className={cn("flex min-h-[min(40vh,16rem)] flex-1 flex-col items-center justify-center py-4", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
      data-slot={dataSlot}
    >
      <BeaconRouteLoadingStatus ariaLabel={ariaLabel} message={message} />
    </div>
  );
}
