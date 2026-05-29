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
  CMS_SLOTS_ENGINE_COMPONENTS_LABEL,
} from "@/shared/lib/cms-slots-feature-copy";
import { ScrollArea } from "@/shared/ui/scroll-area";
import {
  SurfaceSummaryCardPanel,
  SurfaceSummaryCardPanelSectionLabel,
  SurfaceSummaryCardSurfaceSummary,
} from "@/shared/ui/surface-summary-card";
import { ComposerCollapsedDragPreview } from "./composer-collapsed-drag-preview";
import { ComposerOrderSortableRow } from "./composer-order-sortable-row";
import { ComposerRemoveDraftDialog } from "./composer-remove-draft-dialog";
import { useComposerOrderSortable } from "./use-composer-order-sortable";

const DROP_ANIMATION_MS = 200;
const composerOrderListScrollAreaClass = "min-h-0 w-full flex-1 basis-0";
const composerOrderListClass = "m-0 list-none space-y-2 p-2 pb-3";

type ComposerOrderSectionProps = {
  draft: CmsSlotCompositionDraftRow[];
  rowMeta: CmsSlotComposerRowMeta[];
  onChangePropValue: (rowKey: string, propId: string, value: string) => void;
  busy: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRenameSlot: (rowKey: string, name: string) => void;
  onRemove: (key: string) => void;
};

export function ComposerOrderSection(props: ComposerOrderSectionProps) {
  const { draft, rowMeta, onChangePropValue, busy, onReorder, onRenameSlot, onRemove } = props;

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
    <>
      <SurfaceSummaryCardSurfaceSummary
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        data-slot="beacon_composer_order"
      >
        <SurfaceSummaryCardPanelSectionLabel>{CMS_SLOTS_ENGINE_COMPONENTS_LABEL}</SurfaceSummaryCardPanelSectionLabel>
        {draft.length === 0 ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-3">
            <CmsSlotsPanelEmptyState
              data-slot="cms_slots_composer_order_empty"
              icon={ListOrdered}
              title={CMS_SLOTS_COMPOSER_ORDER_EMPTY_TITLE}
              description={CMS_SLOTS_COMPOSER_ORDER_EMPTY_DESCRIPTION}
            />
          </div>
        ) : (
          <SurfaceSummaryCardPanel
            tone="default"
            className="flex min-h-0 flex-1 flex-col"
            data-slot="beacon_composer_order_list"
          >
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetection}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragCancel={onDragCancel}
            >
              <ScrollArea className={composerOrderListScrollAreaClass}>
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  <ul className={composerOrderListClass} aria-label="Composition order">
                    {draft.map((row, index) => {
                      const meta = rowMeta[index];
                      return (
                        <ComposerOrderSortableRow
                          key={row.key}
                          row={row}
                          meta={meta}
                          busy={busy}
                          onChangePropValue={onChangePropValue}
                          onRenameSlot={onRenameSlot}
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
          </SurfaceSummaryCardPanel>
        )}
      </SurfaceSummaryCardSurfaceSummary>
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
    </>
  );
}
