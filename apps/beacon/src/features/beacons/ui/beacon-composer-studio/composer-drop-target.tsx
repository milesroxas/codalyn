import type { DragEvent } from "react";
import { cn } from "@/shared/lib/utils";

type ComposerDropTargetProps = {
  slot: number;
  dragActive: boolean;
  /** Ref-backed; true before React re-renders after drag start (avoids a dead first frame on gaps). */
  reorderInProgress: () => boolean;
  highlighted: boolean;
  busy: boolean;
  onSetDropSlot: (slot: number) => void;
  onDropAtSlot: (slot: number, e: DragEvent<HTMLElement>) => void;
};

export function ComposerDropTarget(props: ComposerDropTargetProps) {
  const { slot, dragActive, reorderInProgress, highlighted, busy, onSetDropSlot, onDropAtSlot } = props;
  const showReorderChrome = dragActive || reorderInProgress();
  return (
    <li data-slot="beacon_composer_drop_target" className="shrink-0 list-none">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden={!showReorderChrome}
        className={cn(
          "relative block w-full rounded-md transition-colors",
          /* Larger hit target while dragging; thin spacer when idle */
          showReorderChrome ? "min-h-4 border-2 border-dashed py-0.5" : "min-h-1.5 border-0 p-0 pointer-events-none",
          showReorderChrome && !highlighted && "border-border/80 bg-muted/30",
          highlighted && "border-primary bg-primary/15 shadow-sm"
        )}
        onDragOver={(e: DragEvent<HTMLButtonElement>) => {
          if (busy) return;
          if (!reorderInProgress()) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onSetDropSlot(slot);
        }}
        onDrop={(e: DragEvent<HTMLButtonElement>) => onDropAtSlot(slot, e)}
      >
        <span
          className={cn(
            "pointer-events-none block min-h-px w-full rounded-full transition-all",
            showReorderChrome && !highlighted && "h-0.5 bg-border/90",
            highlighted && "h-1 bg-primary"
          )}
        />
      </button>
    </li>
  );
}
