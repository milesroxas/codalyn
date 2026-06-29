import { useEffect, useState } from "react";
import type { CmsSlotComposerRowMeta } from "@/features/cms-slots/model/cms-slot-composer-row-meta";
import type { CmsSlotCompositionDraftRow, CmsSlotPaletteEntry } from "@/features/cms-slots/model/site-components";
import type { CmsComposerEditingContextViewModel } from "@/features/cms-slots/model/use-cms-composer-editing-context-state";
import { CmsSlotsComposerEditingContextCard } from "@/features/cms-slots/ui/cms-slots-composer-editing-context-card";
import { Button } from "@/shared/ui/button";
import { ComposerOrderSection } from "./composer-order-section";
import { ComposerPaletteSheet } from "./composer-palette-sheet";
import { ComposerSlotEditView } from "./composer-slot-edit-view";

export type CmsSlotComposerPanelProps = {
  activeListLabel: string;
  composerEditingContext: CmsComposerEditingContextViewModel;
  draft: CmsSlotCompositionDraftRow[];
  dirty: boolean;
  /** Component types present in the Designer-defined CMS slot; Composer can only add from this set. */
  allowedPalette: CmsSlotPaletteEntry[];
  onAddFromPalette: (c: CmsSlotPaletteEntry) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (key: string) => void;
  onBack: () => void;
  onSave: (draftOverride?: CmsSlotCompositionDraftRow[]) => void | Promise<void>;
  savePending: boolean;
  embedSyncPending: boolean;
  rowMeta: CmsSlotComposerRowMeta[];
  onChangePropValue: (rowKey: string, propId: string, value: string) => void;
  onRenameSlot: (rowKey: string, name: string) => void;
  autoOpenEditDialogRowKey?: string | null;
  onAutoOpenEditDialogConsumed?: () => void;
  /** Editor-style Composer: Save lives in the app footer; header shows Back to List only. */
  composerOnly?: boolean;
};

export function CmsSlotComposerPanel(props: CmsSlotComposerPanelProps) {
  const {
    activeListLabel,
    composerEditingContext,
    draft,
    dirty,
    allowedPalette,
    onAddFromPalette,
    onReorder,
    onRemove,
    onBack,
    onSave,
    savePending,
    embedSyncPending,
    rowMeta,
    onChangePropValue,
    onRenameSlot,
    autoOpenEditDialogRowKey = null,
    onAutoOpenEditDialogConsumed,
    composerOnly = false,
  } = props;

  const busy = savePending || embedSyncPending;

  /** Which composition row is open in the dedicated edit view (replaces the prior modal dialog); `null` = list. */
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);

  // Auto-open the edit view for a freshly added row (e.g. right after picking from the palette).
  useEffect(() => {
    if (autoOpenEditDialogRowKey == null) {
      return;
    }
    setEditingRowKey(autoOpenEditDialogRowKey);
    onAutoOpenEditDialogConsumed?.();
  }, [autoOpenEditDialogRowKey, onAutoOpenEditDialogConsumed]);

  const editingIndex = editingRowKey != null ? draft.findIndex((row) => row.key === editingRowKey) : -1;
  const editingRow = editingIndex >= 0 ? draft[editingIndex] : null;

  // Drop the edit view if its row disappears (removed elsewhere, list reloaded) so we don't strand an empty editor.
  useEffect(() => {
    if (editingRowKey != null && editingIndex < 0) {
      setEditingRowKey(null);
    }
  }, [editingRowKey, editingIndex]);

  if (editingRow != null) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden" data-slot="beacon_composer">
        <ComposerSlotEditView
          row={editingRow}
          exposed={rowMeta[editingIndex]?.exposed ?? []}
          busy={busy}
          onChangePropValue={onChangePropValue}
          onRenameSlot={onRenameSlot}
          onDone={() => setEditingRowKey(null)}
        />
      </div>
    );
  }

  // List mode owns the route's horizontal inset (the surface runs flushX so the editor can place its scrollbar in
  // the window gutter); px-3 keeps the list header + cards aligned with the app header and footer.
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden px-3" data-slot="beacon_composer">
      <div className="flex shrink-0 flex-col gap-3">
        <CmsSlotsComposerEditingContextCard context={composerEditingContext} slotListLabel={activeListLabel} />
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <ComposerPaletteSheet allowedPalette={allowedPalette} busy={busy} onAddFromPalette={onAddFromPalette} />
          <div className="flex flex-wrap items-center gap-1.5">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onBack()}>
              {composerOnly ? "Back to List" : "Back"}
            </Button>
            {composerOnly ? null : (
              <Button type="button" size="sm" disabled={!dirty || busy} onClick={() => void onSave()}>
                {savePending ? "Saving…" : "Save"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <ComposerOrderSection
        draft={draft}
        rowMeta={rowMeta}
        busy={busy}
        onReorder={onReorder}
        onEditRow={setEditingRowKey}
        onRemove={onRemove}
      />
    </div>
  );
}
