import { AlertTriangle } from "lucide-react";
import { Button } from "@/shared/ui/button";

type CmsSlotComposerRuntimeSyncAlertProps = {
  embedSyncPending: boolean;
  onSyncInstallEmbed: () => void;
};

export function CmsSlotComposerRuntimeSyncAlert(props: CmsSlotComposerRuntimeSyncAlertProps) {
  const { embedSyncPending, onSyncInstallEmbed } = props;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-amber-500/30 bg-amber-500/8 px-2 py-1.5"
      data-slot="beacon_composer_runtime_alert"
      role="alert"
    >
      <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <Button
        type="button"
        size="sm"
        className="shrink-0"
        disabled={embedSyncPending}
        aria-busy={embedSyncPending}
        onClick={() => void onSyncInstallEmbed()}
      >
        {embedSyncPending ? "Syncing…" : "Sync"}
      </Button>
    </div>
  );
}
