import type { TowerUsageScope } from "@codalyn/webflow-kit";
import {
  TOWER_USAGE_APPROACHING_ALERT_TITLE,
  TOWER_USAGE_APPROACHING_DETAILS_ACTION_LABEL,
} from "@codalyn/webflow-kit";
import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { Alert, AlertAction, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";
import type { UsageApproachingLimitMeter } from "@/shared/ui/usage-approaching-limit-details";
import { UsageApproachingLimitDetails } from "@/shared/ui/usage-approaching-limit-details";

type UsageApproachingLimitCompactBannerProps = {
  meters: ReadonlyArray<UsageApproachingLimitMeter>;
  usageScope?: TowerUsageScope;
  upgradeAction?: ReactNode;
};

export function UsageApproachingLimitCompactBanner(props: UsageApproachingLimitCompactBannerProps) {
  const { meters, usageScope = "user", upgradeAction } = props;
  if (meters.length === 0) {
    return null;
  }

  return (
    <Dialog>
      <Alert variant="warning" className={cn("items-center py-1.5")}>
        <TriangleAlert aria-hidden />
        <AlertTitle className="min-w-0 truncate">{TOWER_USAGE_APPROACHING_ALERT_TITLE}</AlertTitle>
        <AlertAction placement="corner">
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              {TOWER_USAGE_APPROACHING_DETAILS_ACTION_LABEL}
            </Button>
          </DialogTrigger>
        </AlertAction>
      </Alert>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{TOWER_USAGE_APPROACHING_ALERT_TITLE}</DialogTitle>
        </DialogHeader>
        <UsageApproachingLimitDetails meters={meters} usageScope={usageScope} />
        {upgradeAction ? <DialogFooter className="flex-row justify-end gap-2">{upgradeAction}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
