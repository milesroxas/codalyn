import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { BeaconEmbedSyncStripCopy } from "@/features/beacons/model/beacon-embed-sync";
import { Button } from "@/shared/ui/button";
import {
  BEACON_EMBED_SYNC_PHASE_BORDER,
  type BeaconEmbedSyncPhase,
  beaconEmbedSyncPhaseStatusText,
  resolveEmbedPhase,
} from "./phase";

type BeaconEmbedSyncStripProps = {
  dataSlot: string;
  embedSyncPending: boolean;
  disableButton: boolean;
  onSyncInstallEmbed: () => void;
  pageRuntimeStatusLoading: boolean;
  pageRuntimeSynced: boolean;
  pageRuntimeSyncReason?: string;
  copy: BeaconEmbedSyncStripCopy;
};

function PhaseIcon({ phase }: { phase: BeaconEmbedSyncPhase }): ReactNode {
  switch (phase) {
    case "loading":
      return <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />;
    case "synced":
      return <CheckCircle2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />;
    case "unsynced":
      return <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />;
  }
}

export function BeaconEmbedSyncStrip(props: BeaconEmbedSyncStripProps) {
  const {
    dataSlot,
    embedSyncPending,
    disableButton,
    onSyncInstallEmbed,
    pageRuntimeStatusLoading,
    pageRuntimeSynced,
    pageRuntimeSyncReason,
    copy,
  } = props;

  const phase = resolveEmbedPhase(pageRuntimeStatusLoading, pageRuntimeSynced);
  const borderClass = BEACON_EMBED_SYNC_PHASE_BORDER[phase];
  const alignClass = phase === "unsynced" ? "sm:items-start" : "sm:items-center";
  const statusText = beaconEmbedSyncPhaseStatusText(phase, copy, pageRuntimeSyncReason);
  const padClass = phase === "synced" ? "px-2 py-1.5" : "px-2.5 py-2";

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border sm:flex-row ${alignClass} sm:justify-between ${borderClass} ${padClass}`}
      data-slot={dataSlot}
      role={phase === "unsynced" ? "alert" : undefined}
      title={
        phase === "synced"
          ? "Checks the footer beacon script only. Adding components does not change it; publish for live."
          : undefined
      }
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <PhaseIcon phase={phase} />
        <p className="text-xs leading-snug text-muted-foreground">{statusText}</p>
      </div>
      <Button
        type="button"
        variant={phase === "unsynced" ? "default" : "outline"}
        size="sm"
        className="shrink-0"
        disabled={embedSyncPending || disableButton || pageRuntimeStatusLoading}
        aria-busy={embedSyncPending}
        onClick={() => void onSyncInstallEmbed()}
      >
        {embedSyncPending ? "Syncing…" : "Sync page script"}
      </Button>
    </div>
  );
}
