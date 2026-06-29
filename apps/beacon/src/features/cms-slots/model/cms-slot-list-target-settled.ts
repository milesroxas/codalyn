import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";

/** True while list-target reconcile or canvas count is still in flux. */
export function cmsSlotListTargetPhaseUnsettled(
  phase: CmsSlotListTargetPhase,
  onCanvasCountResolved: boolean
): boolean {
  if (phase === "loading" || phase === "updating") {
    return true;
  }
  return phase === "synced" && !onCanvasCountResolved;
}

/** True once list-target phase and canvas count are stable enough to show composition. */
export function cmsSlotListTargetSettled(phase: CmsSlotListTargetPhase, onCanvasCountResolved: boolean): boolean {
  return !cmsSlotListTargetPhaseUnsettled(phase, onCanvasCountResolved);
}
