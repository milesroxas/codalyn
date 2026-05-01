import type { BeaconComposerRowMeta } from "@/features/beacons/model/beacon-composer-row-meta";
import type { BeaconCompositionDraftRow, BeaconPaletteEntry } from "@/features/beacons/model/site-components";
import { Button } from "@/shared/ui/button";
import { BeaconComposerRuntimeSyncAlert } from "./beacon-composer-runtime-sync-alert";
import { ComposerOrderSection } from "./composer-order-section";
import { ComposerPaletteSection } from "./composer-palette-section";

export type BeaconComposerStudioPanelProps = {
  activeDataList: string;
  draft: BeaconCompositionDraftRow[];
  dirty: boolean;
  /** Shown in Target order when the list is empty and CMS state calls for a specific explanation. */
  emptyTargetOrderHint: string | null;
  /** Component types present in the Engine-defined beacon list; Composer can only add from this set. */
  allowedPalette: BeaconPaletteEntry[];
  onAddFromPalette: (c: BeaconPaletteEntry) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (key: string) => void;
  onBack: () => void;
  onSave: () => void;
  savePending: boolean;
  pageRuntimeStatusLoading: boolean;
  pageRuntimeSynced: boolean;
  pageRuntimeSyncReason?: string;
  embedSyncPending: boolean;
  onSyncInstallEmbed: () => void;
  rowMeta: BeaconComposerRowMeta[];
  onChangePropValue: (rowKey: string, propId: string, value: string) => void;
};

export function BeaconComposerStudioPanel(props: BeaconComposerStudioPanelProps) {
  const {
    activeDataList,
    draft,
    dirty,
    emptyTargetOrderHint,
    allowedPalette,
    onAddFromPalette,
    onReorder,
    onRemove,
    onBack,
    onSave,
    savePending,
    pageRuntimeStatusLoading,
    pageRuntimeSynced,
    pageRuntimeSyncReason,
    embedSyncPending,
    onSyncInstallEmbed,
    rowMeta,
    onChangePropValue,
  } = props;

  const busy = savePending || embedSyncPending;

  return (
    <div className="space-y-3" data-slot="beacon_composer_studio">
      {!pageRuntimeStatusLoading && !pageRuntimeSynced ? (
        <BeaconComposerRuntimeSyncAlert
          pageRuntimeSyncReason={pageRuntimeSyncReason}
          embedSyncPending={embedSyncPending}
          onSyncInstallEmbed={onSyncInstallEmbed}
        />
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

      <p className="text-xs leading-snug text-muted-foreground">
        Drag to set order, fill content for fields your designer exposed in Engine, and save. On a collection template,
        the JSON (order + text) is written to the list CMS text field; the Engine reference list is unchanged.
      </p>

      <ComposerOrderSection
        draft={draft}
        rowMeta={rowMeta}
        onChangePropValue={onChangePropValue}
        emptyWhenNoSavedOrderHint={emptyTargetOrderHint}
        allowedPaletteCount={allowedPalette.length}
        busy={busy}
        onReorder={onReorder}
        onRemove={onRemove}
      />

      <ComposerPaletteSection allowedPalette={allowedPalette} busy={busy} onAddFromPalette={onAddFromPalette} />
    </div>
  );
}
