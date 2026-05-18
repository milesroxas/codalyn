import type { CmsSlotComposerRowMeta } from "@/features/cms-slots/model/cms-slot-composer-row-meta";
import type { CmsSlotCompositionDraftRow, CmsSlotPaletteEntry } from "@/features/cms-slots/model/site-components";
import { Button } from "@/shared/ui/button";
import { CmsSlotComposerRuntimeSyncAlert } from "./cms-slot-composer-runtime-sync-alert";
import { ComposerOrderSection } from "./composer-order-section";
import { ComposerPaletteSection } from "./composer-palette-section";

export type CmsSlotComposerStudioPanelProps = {
  activeDataList: string;
  draft: CmsSlotCompositionDraftRow[];
  dirty: boolean;
  /** Component types present in the Engine-defined beacon list; Composer can only add from this set. */
  allowedPalette: CmsSlotPaletteEntry[];
  onAddFromPalette: (c: CmsSlotPaletteEntry) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (key: string) => void;
  onBack: () => void;
  onSave: (draftOverride?: CmsSlotCompositionDraftRow[]) => void | Promise<void>;
  savePending: boolean;
  pageRuntimeStatusLoading: boolean;
  pageRuntimeSynced: boolean;
  embedSyncPending: boolean;
  onSyncInstallEmbed: () => void;
  rowMeta: CmsSlotComposerRowMeta[];
  onChangePropValue: (rowKey: string, propId: string, value: string) => void;
  onRenameSlot: (rowKey: string, name: string) => void;
  /** When true, {@link ComposerPaletteSection} is not rendered (parent places it, e.g. docked above the app footer). */
  omitPalette?: boolean;
};

export function CmsSlotComposerStudioPanel(props: CmsSlotComposerStudioPanelProps) {
  const {
    activeDataList,
    draft,
    dirty,
    allowedPalette,
    onAddFromPalette,
    onReorder,
    onRemove,
    onBack,
    onSave,
    savePending,
    pageRuntimeStatusLoading,
    pageRuntimeSynced,
    embedSyncPending,
    onSyncInstallEmbed,
    rowMeta,
    onChangePropValue,
    onRenameSlot,
    omitPalette = false,
  } = props;

  const busy = savePending || embedSyncPending;

  return (
    <div className="space-y-3" data-slot="beacon_composer_studio">
      {!pageRuntimeStatusLoading && !pageRuntimeSynced ? (
        <CmsSlotComposerRuntimeSyncAlert embedSyncPending={embedSyncPending} onSyncInstallEmbed={onSyncInstallEmbed} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">Studio</p>
          <code className="mt-0.5 block truncate font-mono text-[0.7rem] text-muted-foreground">{activeDataList}</code>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onBack()}>
            Back
          </Button>
          <Button type="button" size="sm" disabled={!dirty || busy || draft.length === 0} onClick={() => void onSave()}>
            {savePending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <ComposerOrderSection
        draft={draft}
        composerDraft={draft}
        rowMeta={rowMeta}
        onChangePropValue={onChangePropValue}
        onRenameSlot={onRenameSlot}
        onPersistComposerSlot={(merged) => void onSave(merged)}
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
