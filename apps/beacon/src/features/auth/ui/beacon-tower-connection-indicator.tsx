import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, RadioTower } from "lucide-react";
import { clearBeaconGuestChosen } from "@/features/auth/lib/beacon-guest-choice";
import { openTowerAppHome } from "@/features/auth/model/tower-auth-client";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

const beaconTowerConnectionIndicatorVariants = cva(
  "size-7 shrink-0 rounded-sm border shadow-none [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      status: {
        connected:
          "border-emerald-500/35 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-400 dark:hover:bg-emerald-400/15",
        connecting:
          "border-amber-500/35 bg-amber-500/10 text-amber-600 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400",
        disconnected:
          "border-border/55 bg-muted/90 text-muted-foreground hover:bg-muted hover:text-foreground dark:border-white/14 dark:bg-muted dark:hover:bg-muted/85",
      },
    },
    defaultVariants: {
      status: "disconnected",
    },
  }
);

export type BeaconTowerConnectionStatus = NonNullable<
  VariantProps<typeof beaconTowerConnectionIndicatorVariants>["status"]
>;

export type BeaconTowerConnectionIndicatorProps = {
  status: BeaconTowerConnectionStatus;
};

export function BeaconTowerConnectionIndicator(props: BeaconTowerConnectionIndicatorProps) {
  const { status } = props;
  const connecting = status === "connecting";

  const tooltip =
    status === "connected"
      ? "Connected to Tower"
      : connecting
        ? "Connecting to Tower…"
        : "Not connected to Tower — click to sign in";

  const handleClick = () => {
    if (connecting) {
      return;
    }
    if (status === "connected") {
      openTowerAppHome();
      return;
    }
    // Reveal the login gate (email/password). The Webflow session is attempted silently on load.
    clearBeaconGuestChosen();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={connecting}
          aria-busy={connecting}
          aria-label={tooltip}
          onClick={handleClick}
          className={cn(beaconTowerConnectionIndicatorVariants({ status: connecting ? "connecting" : status }))}
        >
          {connecting ? <Loader2 aria-hidden className="animate-spin" /> : <RadioTower aria-hidden strokeWidth={2} />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[14rem] text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
