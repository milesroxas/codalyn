import type { BeaconListTargetPhase } from "@/features/beacons/model/beacon-list-target-phase";
import { Button } from "@/shared/ui/button";

type BeaconListTargetActionsBarProps = {
  activeDataList: string | null;
  removingKey: string | null;
  listTargetPhase: BeaconListTargetPhase;
  listTargetActionBusy: boolean;
  listTargetCreatePending: boolean;
  listTargetRemovePending: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  listTargetOnCanvasCount: number;
  onBackToList: () => void;
  onCreateListTarget: () => void;
  onRequestRemoveListTarget: () => void;
  onPlaceListTargetOnCanvas: () => void;
};

function BeaconListTargetSyncedActions(p: {
  ctaDisabled: boolean;
  listTargetRemovePending: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  placeOrFocusLabel: string;
  placeOrFocusPendingLabel: string;
  onBackToList: () => void;
  onRequestRemoveListTarget: () => void;
  onPlaceListTargetOnCanvas: () => void;
}) {
  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={p.ctaDisabled}
        aria-busy={p.listTargetRemovePending}
        onClick={() => void p.onRequestRemoveListTarget()}
      >
        Remove target…
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => void p.onBackToList()}>
        Back to list
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={p.ctaDisabled}
        aria-busy={p.listTargetPlaceOnCanvasPending}
        onClick={() => void p.onPlaceListTargetOnCanvas()}
      >
        {p.listTargetPlaceOnCanvasPending ? p.placeOrFocusPendingLabel : p.placeOrFocusLabel}
      </Button>
    </>
  );
}

export function BeaconListTargetActionsBar(props: BeaconListTargetActionsBarProps) {
  const {
    activeDataList,
    removingKey,
    listTargetPhase,
    listTargetActionBusy,
    listTargetCreatePending,
    listTargetRemovePending,
    listTargetPlaceOnCanvasPending,
    listTargetOnCanvasCount,
    onBackToList,
    onCreateListTarget,
    onRequestRemoveListTarget,
    onPlaceListTargetOnCanvas,
  } = props;
  const ctaDisabled = listTargetActionBusy || removingKey !== null || activeDataList == null;
  const placeOrFocusLabel = listTargetOnCanvasCount > 0 ? "Focus on canvas" : "Place on canvas";
  const placeOrFocusPendingLabel = listTargetOnCanvasCount > 0 ? "Focusing…" : "Placing…";
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
      {listTargetPhase === "synced" ? (
        <BeaconListTargetSyncedActions
          ctaDisabled={ctaDisabled}
          listTargetRemovePending={listTargetRemovePending}
          listTargetPlaceOnCanvasPending={listTargetPlaceOnCanvasPending}
          placeOrFocusLabel={placeOrFocusLabel}
          placeOrFocusPendingLabel={placeOrFocusPendingLabel}
          onBackToList={onBackToList}
          onRequestRemoveListTarget={onRequestRemoveListTarget}
          onPlaceListTargetOnCanvas={onPlaceListTargetOnCanvas}
        />
      ) : listTargetPhase === "absent" ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={ctaDisabled}
            aria-busy={listTargetCreatePending}
            onClick={() => void onCreateListTarget()}
          >
            {listTargetCreatePending ? "Creating…" : "Create target"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void onBackToList()}>
            Back to list
          </Button>
        </>
      ) : (
        <>
          <Button type="button" variant="secondary" size="sm" disabled aria-busy>
            {listTargetPhase === "updating" ? "Updating…" : "Checking…"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void onBackToList()}>
            Back to list
          </Button>
        </>
      )}
    </div>
  );
}
