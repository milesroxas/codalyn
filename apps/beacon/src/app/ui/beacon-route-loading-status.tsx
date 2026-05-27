import { Loader2 } from "lucide-react";
import { BeaconRouteLoadingMessage } from "@/app/ui/beacon-route-loading-message";
import { cn } from "@/shared/lib/utils";

type BeaconRouteLoadingStatusProps = {
  ariaLabel: string;
  message?: string;
  className?: string;
};

/** Spinner plus optional visible task copy (animated when the message changes). */
export function BeaconRouteLoadingStatus(props: BeaconRouteLoadingStatusProps) {
  const { ariaLabel, message, className } = props;
  const visibleMessage = message ?? ariaLabel;
  const showVisibleMessage = message != null;

  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3", className)}
      data-slot="beacon_route_loading_status"
    >
      <Loader2 aria-hidden className="size-6 shrink-0 animate-spin text-muted-foreground" />
      {showVisibleMessage ? (
        <BeaconRouteLoadingMessage message={visibleMessage} />
      ) : (
        <span className="sr-only">{ariaLabel}</span>
      )}
    </div>
  );
}
