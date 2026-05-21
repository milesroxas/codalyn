import { GripVertical, Trash2 } from "lucide-react";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";

/** Visual duplicate of the row header — used inside @dnd-kit DragOverlay only. */
export function ComposerCollapsedDragPreview(props: { row: CmsSlotCompositionDraftRow }) {
  const { row } = props;
  return (
    <div
      aria-hidden
      className="flex min-h-9 max-w-xl cursor-grabbing touch-none flex-nowrap items-center gap-1.5 rounded-sm border border-border bg-card px-2 py-1.5 shadow-lg"
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground">
        <GripVertical className="size-4" aria-hidden />
      </div>
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</p>
      <span className="flex size-7 shrink-0 items-center justify-center text-destructive/80">
        <Trash2 className="size-3.5" aria-hidden />
      </span>
    </div>
  );
}
