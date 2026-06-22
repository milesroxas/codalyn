import { GripVertical, Trash2 } from "lucide-react";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";
import { Badge } from "@/shared/ui/badge";
import { splitComposerRowLabel } from "./composer-order-sortable-row";

/** Visual duplicate of the row header — used inside @dnd-kit DragOverlay only. */
export function ComposerCollapsedDragPreview(props: { row: CmsSlotCompositionDraftRow }) {
  const { row } = props;
  const { displayName, variantBadge } = splitComposerRowLabel(row.name, row.variant);
  return (
    <div
      aria-hidden
      className="flex min-h-8 max-w-xl cursor-grabbing touch-none flex-nowrap items-center gap-0.5 rounded-sm border border-border bg-card px-2 py-1 shadow-lg"
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground">
        <GripVertical className="size-4" aria-hidden />
      </div>
      <p className="min-w-0 flex-1 truncate px-1 text-sm">{displayName}</p>
      {variantBadge != null ? (
        <Badge variant="secondary" size="sm" className="max-w-28 shrink-0 truncate">
          {variantBadge}
        </Badge>
      ) : null}
      <span className="flex size-7 shrink-0 items-center justify-center text-destructive/80">
        <Trash2 className="size-3.5" aria-hidden />
      </span>
    </div>
  );
}
