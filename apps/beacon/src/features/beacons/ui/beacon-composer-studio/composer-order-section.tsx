import { DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useCallback, useMemo, useState } from "react";
import type { BeaconComposerRowMeta } from "@/features/beacons/model/beacon-composer-row-meta";
import type { BeaconCompositionDraftRow } from "@/features/beacons/model/site-components";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { ComposerCollapsedDragPreview } from "./composer-collapsed-drag-preview";
import { ComposerOrderSortableRow } from "./composer-order-sortable-row";
import { useComposerOrderSortable } from "./use-composer-order-sortable";

const DROP_ANIMATION_MS = 200;

type ComposerOrderSectionProps = {
  draft: BeaconCompositionDraftRow[];
  rowMeta: BeaconComposerRowMeta[];
  onChangePropValue: (rowKey: string, propId: string, value: string) => void;
  emptyWhenNoSavedOrderHint: string | null;
  allowedPaletteCount: number;
  busy: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (key: string) => void;
};

export function ComposerOrderSection(props: ComposerOrderSectionProps) {
  const {
    draft,
    rowMeta,
    onChangePropValue,
    emptyWhenNoSavedOrderHint,
    allowedPaletteCount,
    busy,
    onReorder,
    onRemove,
  } = props;

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
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Target order</p>
        <p className="text-xs text-muted-foreground">
          {draft.length} {draft.length === 1 ? "item" : "items"}
        </p>
      </div>

      {draft.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-2.5 py-3 text-sm text-muted-foreground">
          {emptyWhenNoSavedOrderHint != null && emptyWhenNoSavedOrderHint !== "" ? (
            <span className="block leading-snug">{emptyWhenNoSavedOrderHint}</span>
          ) : allowedPaletteCount > 0 ? (
            "Add components from the palette below."
          ) : (
            "No component types in this list yet. Add list items in Engine first."
          )}
        </div>
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
