import { HelpCircle } from "lucide-react";
import type { ComposableInstancePropMeta } from "@/features/beacons/model/beacon-composable-props";
import { BEACON_EMBED_SYNC_STRIP_DEFAULT_COPY } from "@/features/beacons/model/beacon-embed-sync";
import type { BeaconEngineSlotPropsFile } from "@/features/beacons/model/beacon-engine-slot-props";
import type { BeaconListTargetPhase } from "@/features/beacons/model/beacon-list-target-phase";
import type { HydratedBeaconComponent } from "@/features/beacons/model/beacon-page-targets";
import { BeaconEmbedSyncStrip } from "@/features/beacons/ui/beacon-embed-sync-strip";
import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { BeaconCompositionComponentsCatalog } from "./beacon-composition-components-catalog";
import { BeaconEngineSelectedRow } from "./beacon-engine-selected-row";
import { BeaconListTargetActionsBar } from "./beacon-list-target-actions-bar";
import { ListTargetCanvasStatusHint } from "./beacon-list-target-hints";
import { useCompositionComposableMeta } from "./use-composition-composable-meta";

export type BeaconCompositionPanelProps = {
  searchFieldId: string;
  activeDataList: string | null;
  onBackToList: () => void;
  componentQuery: string;
  setComponentQuery: (q: string) => void;
  catalogLoading: boolean;
  catalogError: string | null;
  componentCatalog: ComponentSearchResult[];
  selected: HydratedBeaconComponent[];
  selectedComponentIdSet: Set<string>;
  addPending: boolean;
  onAddComponent: (c: ComponentSearchResult) => void;
  onRemove: (row: HydratedBeaconComponent) => void;
  removingKey: string | null;
  listTargetPhase: BeaconListTargetPhase;
  /** How many list-render target instances for this list exist on the current page. */
  listTargetOnCanvasCount: number;
  onCreateListTarget: () => void;
  onRequestRemoveListTarget: () => void;
  onPlaceListTargetOnCanvas: () => void;
  onSyncListTargetPreview: () => void;
  listTargetCreatePending: boolean;
  listTargetRemovePending: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  listTargetPreviewSyncPending: boolean;
  embedSyncPending: boolean;
  onSyncInstallEmbed: () => void;
  pageRuntimeStatusLoading: boolean;
  pageRuntimeSynced: boolean;
  pageRuntimeSyncReason?: string;
  engineSlotProps: BeaconEngineSlotPropsFile;
  onSetSlotExposed: (slotIndex: number, exposed: ComposableInstancePropMeta[]) => void;
  /** Re-apply `data-codalyn-beacon-prop` on the component definition from current Engine “Expose” + bindings. */
  onResyncEngineSlotAttrs: (slotIndex: number) => void;
  resyncingEngineSlotKey: string | null;
};

export function BeaconCompositionPanel(props: BeaconCompositionPanelProps) {
  const {
    searchFieldId,
    activeDataList,
    onBackToList,
    componentQuery,
    setComponentQuery,
    catalogLoading,
    catalogError,
    componentCatalog,
    selected,
    selectedComponentIdSet,
    addPending,
    onAddComponent,
    onRemove,
    removingKey,
    listTargetPhase,
    onCreateListTarget,
    onRequestRemoveListTarget,
    onPlaceListTargetOnCanvas,
    onSyncListTargetPreview,
    listTargetCreatePending,
    listTargetRemovePending,
    listTargetPlaceOnCanvasPending,
    listTargetPreviewSyncPending,
    listTargetOnCanvasCount,
    embedSyncPending,
    onSyncInstallEmbed,
    pageRuntimeStatusLoading,
    pageRuntimeSynced,
    pageRuntimeSyncReason,
    engineSlotProps,
    onSetSlotExposed,
    onResyncEngineSlotAttrs,
    resyncingEngineSlotKey,
  } = props;

  const listTargetActionBusy =
    listTargetCreatePending ||
    listTargetRemovePending ||
    listTargetPlaceOnCanvasPending ||
    listTargetPreviewSyncPending ||
    listTargetPhase === "loading" ||
    listTargetPhase === "updating";

  const { composableByKey, composableLoading } = useCompositionComposableMeta(selected);

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="shrink-0 font-medium text-foreground">Editing</span>
          {activeDataList != null ? (
            <code className="min-w-0 truncate font-mono text-[0.7rem]">{activeDataList}</code>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" aria-label="Where this lives">
                <HelpCircle className="size-3" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Inside beacons-wrapper. The published runtime is injected as page footer custom code (Webflow Data API),
              not an HTML embed.
            </TooltipContent>
          </Tooltip>
        </div>
        <BeaconListTargetActionsBar
          activeDataList={activeDataList}
          removingKey={removingKey}
          listTargetPhase={listTargetPhase}
          listTargetActionBusy={listTargetActionBusy}
          listTargetCreatePending={listTargetCreatePending}
          listTargetRemovePending={listTargetRemovePending}
          listTargetPlaceOnCanvasPending={listTargetPlaceOnCanvasPending}
          listTargetPreviewSyncPending={listTargetPreviewSyncPending}
          listTargetOnCanvasCount={listTargetOnCanvasCount}
          onBackToList={onBackToList}
          onCreateListTarget={onCreateListTarget}
          onRequestRemoveListTarget={onRequestRemoveListTarget}
          onPlaceListTargetOnCanvas={onPlaceListTargetOnCanvas}
          onSyncListTargetPreview={onSyncListTargetPreview}
        />
      </div>

      <ListTargetCanvasStatusHint listTargetPhase={listTargetPhase} count={listTargetOnCanvasCount} />

      <BeaconEmbedSyncStrip
        dataSlot="beacon_embed_sync"
        embedSyncPending={embedSyncPending}
        disableButton={false}
        onSyncInstallEmbed={onSyncInstallEmbed}
        pageRuntimeStatusLoading={pageRuntimeStatusLoading}
        pageRuntimeSynced={pageRuntimeSynced}
        pageRuntimeSyncReason={pageRuntimeSyncReason}
        copy={BEACON_EMBED_SYNC_STRIP_DEFAULT_COPY}
      />

      <BeaconCompositionComponentsCatalog
        searchFieldId={searchFieldId}
        componentQuery={componentQuery}
        setComponentQuery={setComponentQuery}
        catalogLoading={catalogLoading}
        catalogError={catalogError}
        componentCatalog={componentCatalog}
        selectedComponentIdSet={selectedComponentIdSet}
        addPending={addPending}
        onAddComponent={onAddComponent}
      />

      <div className="space-y-2">
        <p className="text-sm font-medium">Selected</p>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">None</p>
        ) : (
          <ul className="space-y-1.5" aria-label="Selected components">
            {selected.map((row, slotIndex) => (
              <BeaconEngineSelectedRow
                key={row.key}
                row={row}
                slotIndex={slotIndex}
                available={composableByKey[row.key] ?? []}
                slotExposed={engineSlotProps.slots[slotIndex]?.exposed ?? []}
                composableLoading={composableLoading}
                removingKey={removingKey}
                listTargetActionBusy={listTargetActionBusy}
                resyncingEngineSlotKey={resyncingEngineSlotKey}
                onRemove={onRemove}
                onSetSlotExposed={onSetSlotExposed}
                onResyncEngineSlotAttrs={onResyncEngineSlotAttrs}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
