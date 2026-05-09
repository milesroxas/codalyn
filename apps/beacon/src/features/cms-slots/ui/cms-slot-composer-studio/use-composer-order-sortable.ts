import {
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useCallback, useMemo, useState } from "react";
import type { CmsSlotComposerRowMeta } from "@/features/cms-slots/model/cms-slot-composer-row-meta";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";

const POINTER_ACTIVATION_PX = 8;

type UseComposerOrderSortableArgs = {
  draft: CmsSlotCompositionDraftRow[];
  rowMeta: CmsSlotComposerRowMeta[];
  busy: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
};

export type ComposerOrderDragOverlay = {
  row: CmsSlotCompositionDraftRow;
  hasExposedFields: boolean;
} | null;

/**
 * dnd-kit wiring for target-order list: sensors, drag lifecycle, overlay payload.
 */
export function useComposerOrderSortable({ draft, rowMeta, busy, onReorder }: UseComposerOrderSortableArgs) {
  const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: POINTER_ACTIVATION_PX },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id);
  }, []);

  const onDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      if (busy) return;
      const { active, over } = event;
      if (over == null || active.id === over.id) return;
      const oldIndex = draft.findIndex((r) => r.key === active.id);
      const newIndex = draft.findIndex((r) => r.key === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      onReorder(oldIndex, newIndex);
    },
    [busy, draft, onReorder]
  );

  const dragOverlay: ComposerOrderDragOverlay = useMemo(() => {
    if (activeDragId == null) return null;
    const index = draft.findIndex((r) => r.key === activeDragId);
    if (index < 0) return null;
    return {
      row: draft[index],
      hasExposedFields: (rowMeta[index]?.exposed ?? []).length > 0,
    };
  }, [activeDragId, draft, rowMeta]);

  return {
    collisionDetection: closestCorners,
    sensors,
    onDragStart,
    onDragEnd,
    onDragCancel,
    dragOverlay,
  };
}
