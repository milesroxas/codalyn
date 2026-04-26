import type { BeaconEmbedSyncStripCopy } from "@/features/beacons/model/beacon-embed-sync";

export type BeaconEmbedSyncPhase = "loading" | "synced" | "unsynced";

export function resolveEmbedPhase(loading: boolean, synced: boolean): BeaconEmbedSyncPhase {
  if (loading) return "loading";
  if (synced) return "synced";
  return "unsynced";
}

export const BEACON_EMBED_SYNC_PHASE_BORDER: Record<BeaconEmbedSyncPhase, string> = {
  loading: "border-border/80 bg-muted/15",
  synced: "border-border/60 bg-muted/10",
  unsynced: "border-amber-500/30 bg-amber-500/8",
};

export function beaconEmbedSyncPhaseStatusText(
  phase: BeaconEmbedSyncPhase,
  copy: BeaconEmbedSyncStripCopy,
  reason?: string
): string {
  switch (phase) {
    case "loading":
      return copy.loading;
    case "synced":
      return copy.synced;
    case "unsynced":
      return reason ?? copy.unsyncedFallback;
  }
}
