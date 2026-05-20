import { SquareCode } from "lucide-react";
import { CMS_SLOTS_SYNC_REQUIRES_INSTALL_TOOLTIP } from "@/shared/lib/cms-slots-feature-copy";
import { Button } from "@/shared/ui/button";

export type CmsSlotsPageRuntimeSyncButtonProps = {
  /** Footer Sync is shown only when the page wrapper is installed and at least one list exists. */
  relevant: boolean;
  synced: boolean;
  reason: string | undefined;
  statusLoading: boolean;
  embedSyncPending: boolean;
  beaconsWrapperInstalled: boolean;
  pageScanLoading: boolean;
  onSync: () => void | Promise<void>;
  /** Editor-style dock: stretch Sync across the footer row. */
  composerOnly?: boolean;
};

/** Single UI surface for page-script sync (footer dock). */
export function CmsSlotsPageRuntimeSyncButton(props: CmsSlotsPageRuntimeSyncButtonProps) {
  const needsAttention =
    props.relevant && !props.synced && !props.statusLoading && !props.embedSyncPending && !props.pageScanLoading;

  return (
    <Button
      type="button"
      variant={needsAttention ? "default" : "secondary"}
      size="dockNav"
      className={props.composerOnly ? "min-w-0 flex-1" : undefined}
      disabled={
        props.embedSyncPending || props.statusLoading || !props.beaconsWrapperInstalled || props.pageScanLoading
      }
      aria-busy={props.embedSyncPending}
      title={
        !props.beaconsWrapperInstalled
          ? CMS_SLOTS_SYNC_REQUIRES_INSTALL_TOOLTIP
          : props.statusLoading
            ? "Checking page script…"
            : needsAttention
              ? (props.reason ?? "Sync to update the embedded page script.")
              : undefined
      }
      onClick={() => void props.onSync()}
    >
      <SquareCode aria-hidden />
      {props.embedSyncPending ? "Syncing…" : "Sync"}
    </Button>
  );
}
