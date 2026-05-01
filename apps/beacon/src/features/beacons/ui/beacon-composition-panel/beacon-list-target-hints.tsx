import type { BeaconListTargetPhase } from "@/features/beacons/model/beacon-list-target-phase";

type ListTargetCanvasStatusHintProps = {
  listTargetPhase: BeaconListTargetPhase;
  count: number;
};

export function ListTargetCanvasStatusHint(props: ListTargetCanvasStatusHintProps) {
  const { listTargetPhase, count } = props;
  if (listTargetPhase !== "synced") {
    return null;
  }
  if (count > 0) {
    return (
      <div
        className="flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-2 text-xs text-foreground"
        data-slot="beacon_list_target_on_canvas"
        role="status"
      >
        <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium text-emerald-900 dark:text-emerald-200">
            {count === 1 ? "List target is on this page" : `${count} list targets on this page`}
          </p>
          <p className="text-[0.7rem] leading-snug text-muted-foreground">
            {count === 1
              ? "Use Focus on canvas to select it in the Designer. Only one target per list is used — extra copies can be removed on the canvas."
              : "Use Focus on canvas to select the first one. Remove extras so a single list target remains on the page."}
          </p>
        </div>
      </div>
    );
  }
  return (
    <p className="text-xs leading-snug text-muted-foreground" data-slot="beacon_list_target_place_hint">
      No list target on this page yet. Adding a component from the catalog places it automatically, or use Place on
      canvas. Only one target per list is used on the page.
    </p>
  );
}
