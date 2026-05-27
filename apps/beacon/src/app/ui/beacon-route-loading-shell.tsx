import { BeaconRouteLoadingStatus } from "@/app/ui/beacon-route-loading-status";
import { RouteLoadingSurface } from "@/shared/ui/route-loading";

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
    <RouteLoadingSurface
      layout="shell"
      className={className}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
      data-slot={dataSlot}
    >
      <BeaconRouteLoadingStatus ariaLabel={ariaLabel} message={message} />
    </RouteLoadingSurface>
  );
}
