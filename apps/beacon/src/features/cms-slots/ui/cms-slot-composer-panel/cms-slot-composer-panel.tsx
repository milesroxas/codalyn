import type { CmsSlotComposerRowMeta } from "@/features/cms-slots/model/cms-slot-composer-row-meta";
import type { CmsSlotCompositionDraftRow, CmsSlotPaletteEntry } from "@/features/cms-slots/model/site-components";
import type { CmsComposerEditingContextViewModel } from "@/features/cms-slots/model/use-cms-composer-editing-context-state";
import { CmsSlotsComposerEditingContextCard } from "@/features/cms-slots/ui/cms-slots-composer-editing-context-card";
import { Button } from "@/shared/ui/button";
import { ComposerOrderSection } from "./composer-order-section";
import { ComposerPaletteSection } from "./composer-palette-section";

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
  /** When true, {@link ComposerPaletteSection} is not rendered (parent places it, e.g. docked above the app footer). */
  omitPalette?: boolean;
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
    omitPalette = false,
    composerOnly = false,
  } = props;

  const busy = savePending || embedSyncPending;

  return (
    <div className="space-y-3" data-slot="beacon_composer">
      <CmsSlotsComposerEditingContextCard context={composerEditingContext} slotListLabel={activeListLabel} />
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onBack()}>
          {composerOnly ? "Back to List" : "Back"}
        </Button>
        {composerOnly ? null : (
          <Button type="button" size="sm" disabled={!dirty || busy} onClick={() => void onSave()}>
            {savePending ? "Saving…" : "Save"}
          </Button>
        )}
      </div>

      <ComposerOrderSection
        draft={draft}
        rowMeta={rowMeta}
        onChangePropValue={onChangePropValue}
        onRenameSlot={onRenameSlot}
        busy={busy}
        onReorder={onReorder}
        onRemove={onRemove}
      />

      {omitPalette ? null : (
        <ComposerPaletteSection allowedPalette={allowedPalette} busy={busy} onAddFromPalette={onAddFromPalette} />
      )}
    </div>
  );
}
