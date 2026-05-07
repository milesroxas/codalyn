import { ChevronDown, GripVertical, Trash2 } from "lucide-react";
import type { BeaconCompositionDraftRow } from "@/features/beacons/model/site-components";

/** Visual duplicate of the collapsed header row — used inside @dnd-kit DragOverlay only. */
export function ComposerCollapsedDragPreview(props: { row: BeaconCompositionDraftRow; hasExposedFields: boolean }) {
  const { row, hasExposedFields } = props;
  return (
    <div
      aria-hidden
      className="flex min-h-9 max-w-xl cursor-grabbing touch-none flex-nowrap items-center gap-1.5 rounded-sm border border-border bg-card px-2 py-1.5 shadow-lg"
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground">
        <GripVertical className="size-4" aria-hidden />
      </div>
      {hasExposedFields ? (
        <span className="flex size-7 shrink-0 items-center justify-center text-muted-foreground">
          <ChevronDown className="-rotate-90 size-4" aria-hidden />
        </span>
      ) : null}
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</p>
      <span className="flex size-7 shrink-0 items-center justify-center text-destructive/80">
        <Trash2 className="size-3.5" aria-hidden />
      </span>
    </div>
  );
}
