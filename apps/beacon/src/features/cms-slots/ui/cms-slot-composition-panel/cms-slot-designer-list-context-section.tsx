import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";
import { CmsSlotDesignerSlotComponentSection } from "./cms-slot-designer-slot-component-section";

type CmsSlotDesignerListContextSectionProps = {
  activeDataList: string | null;
  removingKey: string | null;
  listTargetPhase: CmsSlotListTargetPhase;
  listTargetActionBusy: boolean;
  listTargetCreatePending: boolean;
  listTargetRemovePending: boolean;
  listTargetFocusOnCanvasPending: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  listTargetSelectedOnCanvas: boolean;
  listTargetOnCanvasCount: number;
  listTargetOnCanvasCountResolved: boolean;
  onCreateListTarget: () => void;
  onRequestRemoveListTarget: () => void;
  onFocusListTargetOnCanvas: () => void;
  onPlaceListTargetOnCanvas: () => void;
};

export function CmsSlotDesignerListContextSection(props: CmsSlotDesignerListContextSectionProps) {
  const {
    activeDataList,
    removingKey,
    listTargetPhase,
    listTargetActionBusy,
    listTargetCreatePending,
    listTargetRemovePending,
    listTargetFocusOnCanvasPending,
    listTargetPlaceOnCanvasPending,
    listTargetSelectedOnCanvas,
    listTargetOnCanvasCount,
    listTargetOnCanvasCountResolved,
    onCreateListTarget,
    onRequestRemoveListTarget,
    onFocusListTargetOnCanvas,
    onPlaceListTargetOnCanvas,
  } = props;

  const ctaDisabled = listTargetActionBusy || removingKey !== null || activeDataList == null;

  return (
    <CmsSlotDesignerSlotComponentSection
      ctaDisabled={ctaDisabled}
      listTargetCreatePending={listTargetCreatePending}
      listTargetFocusOnCanvasPending={listTargetFocusOnCanvasPending}
      listTargetOnCanvasCount={listTargetOnCanvasCount}
      listTargetOnCanvasCountResolved={listTargetOnCanvasCountResolved}
      listTargetPhase={listTargetPhase}
      listTargetPlaceOnCanvasPending={listTargetPlaceOnCanvasPending}
      listTargetRemovePending={listTargetRemovePending}
      listTargetSelectedOnCanvas={listTargetSelectedOnCanvas}
      onCreateListTarget={onCreateListTarget}
      onFocusListTargetOnCanvas={onFocusListTargetOnCanvas}
      onPlaceListTargetOnCanvas={onPlaceListTargetOnCanvas}
      onRequestRemoveListTarget={onRequestRemoveListTarget}
    />
  );
}
