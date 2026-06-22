import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
import type { CmsSlotComposerRowMeta } from "@/features/cms-slots/model/cms-slot-composer-row-meta";
import type { CmsSlotSelectedVariant } from "@/features/cms-slots/model/cms-slot-instance-variant";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ComposerSlotNameDialog } from "./composer-slot-name-dialog";

/**
 * Splits a draft row's display name into the base label + the pinned variant (shown as a badge, not appended text).
 * The default name is `"Component · Variant"` (see `poolOptionLabel`); strip that suffix when present so the badge isn't
 * duplicated, while a user-renamed name is left intact.
 */
export function splitComposerRowLabel(
  name: string,
  variant: CmsSlotSelectedVariant | null
): { displayName: string; variantBadge: string | null } {
  const variantBadge = variant?.variantName ?? null;
  if (variantBadge != null) {
    const suffix = ` · ${variantBadge}`;
    if (name.endsWith(suffix)) {
      return { displayName: name.slice(0, name.length - suffix.length), variantBadge };
    }
  }
  return { displayName: name, variantBadge };
}

export type ComposerOrderSortableRowProps = {
  row: CmsSlotCompositionDraftRow;
  meta: CmsSlotComposerRowMeta | undefined;
  busy: boolean;
  onChangePropValue: (rowKey: string, propId: string, value: string) => void;
  onRenameSlot: (rowKey: string, name: string) => void;
  onRemove: (key: string) => void;
  autoOpenEditDialogRowKey?: string | null;
  onAutoOpenEditDialogConsumed?: () => void;
};

export function ComposerOrderSortableRow(props: ComposerOrderSortableRowProps) {
  const {
    row,
    meta,
    busy,
    onChangePropValue,
    onRenameSlot,
    onRemove,
    autoOpenEditDialogRowKey = null,
    onAutoOpenEditDialogConsumed,
  } = props;
  const exposed = meta?.exposed ?? [];
  const { displayName, variantBadge } = splitComposerRowLabel(row.name, row.variant);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.key,
    disabled: busy,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : undefined,
    opacity: isDragging ? 0 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-slot="cms_slot_composer_row"
      className="relative list-none rounded-sm border border-border/70 bg-card shadow-sm"
    >
      <div className="flex min-h-8 items-center gap-0.5 px-2 py-1">
        <button
          type="button"
          className={cn(
            "flex size-7 shrink-0 touch-none items-center justify-center rounded-sm text-muted-foreground hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-40",
            "cursor-grab"
          )}
          aria-label={`Drag to reorder ${row.name}`}
          disabled={busy}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="pointer-events-none size-4" aria-hidden />
        </button>
        <ComposerSlotNameDialog
          row={row}
          exposed={exposed}
          disabled={busy}
          triggerLabel={displayName}
          onRename={onRenameSlot}
          onChangePropValue={onChangePropValue}
          requestAutoOpen={autoOpenEditDialogRowKey === row.key}
          onAutoOpenConsumed={onAutoOpenEditDialogConsumed}
        />
        {variantBadge != null ? (
          <Badge variant="secondary" size="sm" className="max-w-28 shrink-0 truncate">
            {variantBadge}
          </Badge>
        ) : null}
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="shrink-0 text-destructive hover:bg-destructive/10"
          aria-label={`Remove ${row.name}`}
          disabled={busy}
          onClick={() => onRemove(row.key)}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </Button>
      </div>
    </li>
  );
}
