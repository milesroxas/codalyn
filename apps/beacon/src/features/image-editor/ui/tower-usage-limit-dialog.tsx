import { IconChartBar } from "@tabler/icons-react";
import {
  TOWER_USAGE_LIMIT_DIALOG_DISMISS_LABEL,
  TOWER_USAGE_LIMIT_DIALOG_WEBP_HINT,
  TOWER_USAGE_LIMIT_RESET_LABEL,
  towerUsageLimitDialogDescription,
  towerUsageLimitDialogTitle,
  towerUsageLimitDialogUsageLine,
  towerUsageLimitResetDetailLine,
} from "@/shared/lib/tower-usage-limit-copy";
import type { TowerUsageLimitDetails } from "@/shared/lib/tower-usage-limit-error";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFact,
  AlertDialogFactHint,
  AlertDialogFactLabel,
  AlertDialogFactPanel,
  AlertDialogFactValue,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

export type TowerUsageLimitDialogProps = {
  open: boolean;
  details: TowerUsageLimitDetails | null;
  onOpenChange: (open: boolean) => void;
};

export function TowerUsageLimitDialog(props: TowerUsageLimitDialogProps) {
  const { open, details, onOpenChange } = props;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <IconChartBar aria-hidden stroke={1.5} />
          </AlertDialogMedia>
          {details ? (
            <>
              <AlertDialogTitle>{towerUsageLimitDialogTitle(details.kind)}</AlertDialogTitle>
              <AlertDialogDescription>{towerUsageLimitDialogDescription(details.kind)}</AlertDialogDescription>
            </>
          ) : null}
        </AlertDialogHeader>
        {details ? (
          <AlertDialogFactPanel>
            <AlertDialogFact>
              <AlertDialogFactLabel>Usage</AlertDialogFactLabel>
              <AlertDialogFactValue>
                {towerUsageLimitDialogUsageLine(details.used, details.limit, details.kind)}
              </AlertDialogFactValue>
              {details.kind === "webflow" ? (
                <AlertDialogFactHint>{TOWER_USAGE_LIMIT_DIALOG_WEBP_HINT}</AlertDialogFactHint>
              ) : null}
            </AlertDialogFact>
            <AlertDialogFact>
              <AlertDialogFactLabel>{TOWER_USAGE_LIMIT_RESET_LABEL}</AlertDialogFactLabel>
              <AlertDialogFactValue>{towerUsageLimitResetDetailLine()}</AlertDialogFactValue>
            </AlertDialogFact>
          </AlertDialogFactPanel>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel type="button">{TOWER_USAGE_LIMIT_DIALOG_DISMISS_LABEL}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
