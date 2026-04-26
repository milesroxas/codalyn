import { type DragEvent, useCallback, useRef, useState } from "react";
import {
  BEACON_COMPOSER_REORDER_DND_MIME,
  readDraggedKeyFromDataTransfer,
} from "@/features/beacons/model/beacon-composer-reorder-dnd";
import type { BeaconCompositionDraftRow } from "@/features/beacons/model/site-components";

type UseComposerReorderDndOptions = {
  draft: BeaconCompositionDraftRow[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  busy: boolean;
};

/**
 * Synchronous drag key + drop slot state for reordering composition rows.
 * `drop` can lead React state; refs preserve identity for the same event task.
 */
export function useComposerReorderDnd({ draft, onReorder, busy }: UseComposerReorderDndOptions) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropSlotIndex, setDropSlotIndex] = useState<number | null>(null);
  const dragActive = draggingKey != null;

  const dragKeyRef = useRef<string | null>(null);
  const dropEventHandledRef = useRef(false);

  const isReorderInProgress = useCallback(() => dragKeyRef.current != null, []);

  const resetDragState = useCallback(() => {
    dragKeyRef.current = null;
    setDraggingKey(null);
    setDropSlotIndex(null);
  }, []);

  const handleDropAtSlot = (slot: number, e: DragEvent<HTMLElement>) => {
    if (busy) return;
    e.preventDefault();
    dropEventHandledRef.current = true;
    const fromKey = readDraggedKeyFromDataTransfer(e.dataTransfer, dragKeyRef.current);
    if (!fromKey) {
      resetDragState();
      return;
    }
    const fromIndex = draft.findIndex((row) => row.key === fromKey);
    if (fromIndex < 0) {
      resetDragState();
      return;
    }
    const toIndex = fromIndex < slot ? slot - 1 : slot;
    if (toIndex !== fromIndex && toIndex >= 0 && toIndex <= draft.length - 1) {
      onReorder(fromIndex, toIndex);
    }
    resetDragState();
  };

  const handleDragStart = (key: string, index: number, e: DragEvent<HTMLButtonElement>) => {
    dropEventHandledRef.current = false;
    dragKeyRef.current = key;
    setDraggingKey(key);
    setDropSlotIndex(index);
    e.dataTransfer.setData("text/plain", key);
    e.dataTransfer.setData(BEACON_COMPOSER_REORDER_DND_MIME, key);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    if (typeof window === "undefined") {
      resetDragState();
      return;
    }
    // `drop` must run in the same task before microtasks; if not (some embedded hosts), we still
    // must not clear `dragKeyRef` until after a microtask so a late `drop` can read it.
    queueMicrotask(() => {
      if (!dropEventHandledRef.current) {
        resetDragState();
      }
      dropEventHandledRef.current = false;
    });
  };

  return {
    dragActive,
    draggingKey,
    dropSlotIndex,
    isReorderInProgress,
    setDropSlotIndex,
    handleDropAtSlot,
    handleDragStart,
    handleDragEnd,
  };
}
