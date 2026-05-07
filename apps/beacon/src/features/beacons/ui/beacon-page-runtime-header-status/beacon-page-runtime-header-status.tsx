import { Loader2 } from "lucide-react";

type BeaconPageRuntimeHeaderStatusProps = {
  loading: boolean;
  synced: boolean;
  reason?: string;
};

/** Header chip only when attention is needed (loading or drift), to avoid duplicate “all good” noise. */
export function BeaconPageRuntimeHeaderStatus(props: BeaconPageRuntimeHeaderStatusProps) {
  const { loading, synced, reason } = props;

  if (loading) {
    return (
      <div
        className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border/80 bg-muted/30 px-1.5 py-0.5"
        data-slot="beacon_page_runtime_header"
        role="status"
        aria-busy="true"
        aria-label="Checking page script"
      >
        <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        <span className="text-[0.65rem] font-medium leading-none text-muted-foreground">Checking…</span>
      </div>
    );
  }

  if (!synced) {
    return (
      <div
        className="inline-flex max-w-[min(12rem,45vw)] shrink-0 items-center gap-1.5 rounded-sm border border-amber-500/35 bg-amber-500/12 px-1.5 py-0.5"
        data-slot="beacon_page_runtime_header"
        role="status"
        title={reason ?? undefined}
      >
        <span
          className="size-1.5 shrink-0 rounded-sm bg-amber-500 shadow-[0_0_0_1px_rgba(245,158,11,0.35)]"
          aria-hidden
        />
        <span className="truncate text-[0.65rem] font-medium leading-none text-amber-950 dark:text-amber-200">
          Sync needed
        </span>
      </div>
    );
  }

  return null;
}
