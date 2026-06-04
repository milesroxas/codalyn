import type { CmsSlotComposerRowMeta } from "@/features/cms-slots/model/cms-slot-composer-row-meta";
import type { CmsSlotCompositionDraftRow, CmsSlotPaletteEntry } from "@/features/cms-slots/model/site-components";
import type { CmsComposerEditingContextViewModel } from "@/features/cms-slots/model/use-cms-composer-editing-context-state";
import { CmsSlotsComposerEditingContextCard } from "@/features/cms-slots/ui/cms-slots-composer-editing-context-card";
import { Button } from "@/shared/ui/button";
import { ComposerOrderSection } from "./composer-order-section";
import { ComposerPaletteSheet } from "./composer-palette-sheet";

export type CmsSlotComposerPanelProps = {
  activeListLabel: string;
  composerEditingContext: CmsComposerEditingContextViewModel;
  draft: CmsSlotCompositionDraftRow[];
  dirty: boolean;
  /** Component types present in the Engine-defined CMS slot; Composer can only add from this set. */
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
  autoOpenEditDrawerRowKey?: string | null;
  onAutoOpenEditDrawerConsumed?: () => void;
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
    autoOpenEditDrawerRowKey = null,
    onAutoOpenEditDrawerConsumed,
    composerOnly = false,
  } = props;

  const busy = savePending || embedSyncPending;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden" data-slot="beacon_composer">
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
        onChangePropValue={onChangePropValue}
        onRenameSlot={onRenameSlot}
        busy={busy}
        onReorder={onReorder}
        onRemove={onRemove}
        autoOpenEditDrawerRowKey={autoOpenEditDrawerRowKey}
        onAutoOpenEditDrawerConsumed={onAutoOpenEditDrawerConsumed}
      />
    </div>
  );
}
