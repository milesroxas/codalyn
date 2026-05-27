import { DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ListOrdered } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { CmsSlotComposerRowMeta } from "@/features/cms-slots/model/cms-slot-composer-row-meta";
import { composerDraftRowHasContent } from "@/features/cms-slots/model/composer-draft-row-has-content";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";
import { CmsSlotsPanelEmptyState } from "@/features/cms-slots/ui/cms-slots-panel-empty-state";
import {
  CMS_SLOTS_COMPOSER_ORDER_EMPTY_DESCRIPTION,
  CMS_SLOTS_COMPOSER_ORDER_EMPTY_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { ComposerCollapsedDragPreview } from "./composer-collapsed-drag-preview";
import { ComposerOrderSortableRow } from "./composer-order-sortable-row";
import { ComposerRemoveDraftDialog } from "./composer-remove-draft-dialog";
import { useComposerOrderSortable } from "./use-composer-order-sortable";

const DROP_ANIMATION_MS = 200;

type ComposerOrderSectionProps = {
  draft: CmsSlotCompositionDraftRow[];
  /** Full composition snapshot for drawer Save → CMS persist (same as {@link draft}). */
  composerDraft: CmsSlotCompositionDraftRow[];
  rowMeta: CmsSlotComposerRowMeta[];
  onChangePropValue: (rowKey: string, propId: string, value: string) => void;
  busy: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRenameSlot: (rowKey: string, name: string) => void;
  /** Persist merged draft after slot drawer commits name — matches header Save. */
  onPersistComposerSlot?: (merged: CmsSlotCompositionDraftRow[]) => void | Promise<void>;
  onRemove: (key: string) => void;
};

export function ComposerOrderSection(props: ComposerOrderSectionProps) {
  const {
    draft,
    composerDraft,
    rowMeta,
    onChangePropValue,
    busy,
    onReorder,
    onRenameSlot,
    onPersistComposerSlot,
    onRemove,
  } = props;

  const [removeConfirmKey, setRemoveConfirmKey] = useState<string | null>(null);
  const removeConfirmRow = draft.find((row) => row.key === removeConfirmKey) ?? null;

  const handleRequestRemove = useCallback(
    (key: string) => {
      const row = draft.find((entry) => entry.key === key);
      if (row == null) {
        return;
      }
      if (!composerDraftRowHasContent(row)) {
        onRemove(key);
        return;
      }
      setRemoveConfirmKey(key);
    },
    [draft, onRemove]
  );

  const handleConfirmRemove = useCallback(() => {
    if (removeConfirmKey != null) {
      onRemove(removeConfirmKey);
    }
    setRemoveConfirmKey(null);
  }, [onRemove, removeConfirmKey]);

  const { collisionDetection, sensors, onDragStart, onDragEnd, onDragCancel, dragOverlay } = useComposerOrderSortable({
    draft,
    busy,
    onReorder,
  });

  const sortableIds = useMemo(() => draft.map((r) => r.key), [draft]);

  return (
    <section className="space-y-2" data-slot="beacon_composer_order">
      {draft.length === 0 ? (
        <CmsSlotsPanelEmptyState
          data-slot="cms_slots_composer_order_empty"
          icon={ListOrdered}
          title={CMS_SLOTS_COMPOSER_ORDER_EMPTY_TITLE}
          description={CMS_SLOTS_COMPOSER_ORDER_EMPTY_DESCRIPTION}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <ScrollArea className="h-[min(48vh,22rem)]">
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <ul className="m-0 list-none space-y-2 p-0" aria-label="Composition order">
                {draft.map((row, index) => {
                  const meta = rowMeta[index];
                  return (
                    <ComposerOrderSortableRow
                      key={row.key}
                      row={row}
                      meta={meta}
                      busy={busy}
                      composerDraft={composerDraft}
                      onChangePropValue={onChangePropValue}
                      onRenameSlot={onRenameSlot}
                      onPersistComposerSlot={onPersistComposerSlot}
                      onRemove={handleRequestRemove}
                    />
                  );
                })}
              </ul>
            </SortableContext>
          </ScrollArea>
          <DragOverlay
            dropAnimation={{
              duration: DROP_ANIMATION_MS,
              easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
            }}
          >
            {dragOverlay != null ? <ComposerCollapsedDragPreview row={dragOverlay.row} /> : null}
          </DragOverlay>
        </DndContext>
      )}
      <ComposerRemoveDraftDialog
        open={removeConfirmKey != null}
        componentName={removeConfirmRow?.name ?? null}
        busy={busy}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveConfirmKey(null);
          }
        }}
        onConfirm={handleConfirmRemove}
      />
    </section>
  );
}
