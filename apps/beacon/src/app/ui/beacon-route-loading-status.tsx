import { Loader2 } from "lucide-react";
import { BeaconRouteLoadingMessage } from "@/app/ui/beacon-route-loading-message";
import { cn } from "@/shared/lib/utils";

type BeaconRouteLoadingStatusProps = {
  ariaLabel: string;
  message?: string;
  /** Secondary context line under the message — what the wait is for, in concise product copy. */
  description?: string;
  className?: string;
};

/** Spinner plus optional visible task copy (animated when the message changes) and a context line. */
export function BeaconRouteLoadingStatus(props: BeaconRouteLoadingStatusProps) {
  const { ariaLabel, message, description, className } = props;
  const visibleMessage = message ?? ariaLabel;
  const showVisibleMessage = message != null;

  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3", className)}
      data-slot="beacon_route_loading_status"
    >
      <Loader2 aria-hidden className="size-6 shrink-0 animate-spin text-muted-foreground" />
      {showVisibleMessage ? (
        <div className="flex flex-col items-center gap-1">
          <BeaconRouteLoadingMessage message={visibleMessage} />
          {description ? (
            <p
              className="max-w-[18rem] text-balance text-center text-xs text-muted-foreground/80"
              data-slot="beacon_route_loading_description"
            >
              {description}
            </p>
          ) : null}
        </div>
      ) : (
        <span className="sr-only">{ariaLabel}</span>
      )}
    </div>
  );
}
