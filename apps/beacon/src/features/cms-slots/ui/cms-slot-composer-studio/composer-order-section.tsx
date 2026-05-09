import { DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useCallback, useMemo, useState } from "react";
import type { CmsSlotComposerRowMeta } from "@/features/cms-slots/model/cms-slot-composer-row-meta";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { ComposerCollapsedDragPreview } from "./composer-collapsed-drag-preview";
import { ComposerOrderSortableRow } from "./composer-order-sortable-row";
import { useComposerOrderSortable } from "./use-composer-order-sortable";

const DROP_ANIMATION_MS = 200;

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

  const [fieldsOpenByKey, setFieldsOpenByKey] = useState<Record<string, boolean>>({});

  const setFieldsOpen = useCallback((key: string, open: boolean) => {
    setFieldsOpenByKey((prev) => ({ ...prev, [key]: open }));
  }, []);

  const { collisionDetection, sensors, onDragStart, onDragEnd, onDragCancel, dragOverlay } = useComposerOrderSortable({
    draft,
    rowMeta,
    busy,
    onReorder,
  });

  const sortableIds = useMemo(() => draft.map((r) => r.key), [draft]);

  return (
    <section className="space-y-2" data-slot="beacon_composer_order">
      {draft.length === 0 ? (
        <div className="min-h-24 rounded-sm border border-dashed border-border bg-muted/10" aria-hidden />
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
                  const hasFields = (meta?.exposed ?? []).length > 0;
                  const fieldsOpen = fieldsOpenByKey[row.key] ?? false;
                  return (
                    <ComposerOrderSortableRow
                      key={row.key}
                      row={row}
                      meta={meta}
                      busy={busy}
                      fieldsOpen={hasFields ? fieldsOpen : false}
                      onFieldsOpenChange={(open) => setFieldsOpen(row.key, open)}
                      onChangePropValue={onChangePropValue}
                      onRenameSlot={onRenameSlot}
                      onRemove={onRemove}
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
            {dragOverlay != null ? (
              <ComposerCollapsedDragPreview row={dragOverlay.row} hasExposedFields={dragOverlay.hasExposedFields} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </section>
  );
}
