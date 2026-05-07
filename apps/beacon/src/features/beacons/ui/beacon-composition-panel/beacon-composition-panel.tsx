import type { ComposableInstancePropMeta } from "@/features/beacons/model/beacon-composable-props";
import type { BeaconEngineSlotPropsFile } from "@/features/beacons/model/beacon-engine-slot-props";
import type { BeaconListTargetPhase } from "@/features/beacons/model/beacon-list-target-phase";
import type { HydratedBeaconComponent } from "@/features/beacons/model/beacon-page-targets";
import { BeaconCompositionComponentsCatalog } from "./beacon-composition-components-catalog";
import { BeaconEngineSelectedRow } from "./beacon-engine-selected-row";
import { BeaconListTargetActionsBar } from "./beacon-list-target-actions-bar";
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
  listTargetCreatePending: boolean;
  listTargetRemovePending: boolean;
  listTargetPlaceOnCanvasPending: boolean;
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
    listTargetCreatePending,
    listTargetRemovePending,
    listTargetPlaceOnCanvasPending,
    listTargetOnCanvasCount,
    engineSlotProps,
    onSetSlotExposed,
    onResyncEngineSlotAttrs,
    resyncingEngineSlotKey,
  } = props;

  const listTargetActionBusy =
    listTargetCreatePending ||
    listTargetRemovePending ||
    listTargetPlaceOnCanvasPending ||
    listTargetPhase === "loading" ||
    listTargetPhase === "updating";

  const { composableByKey, composableLoading } = useCompositionComposableMeta(selected);

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-1.5 text-xs">
          <span className="shrink-0 font-medium text-foreground">Editing</span>
          {activeDataList != null ? (
            <code className="min-w-0 truncate font-mono text-[0.7rem] text-muted-foreground">{activeDataList}</code>
          ) : null}
        </div>
        <BeaconListTargetActionsBar
          activeDataList={activeDataList}
          removingKey={removingKey}
          listTargetPhase={listTargetPhase}
          listTargetActionBusy={listTargetActionBusy}
          listTargetCreatePending={listTargetCreatePending}
          listTargetRemovePending={listTargetRemovePending}
          listTargetPlaceOnCanvasPending={listTargetPlaceOnCanvasPending}
          listTargetOnCanvasCount={listTargetOnCanvasCount}
          onBackToList={onBackToList}
          onCreateListTarget={onCreateListTarget}
          onRequestRemoveListTarget={onRequestRemoveListTarget}
          onPlaceListTargetOnCanvas={onPlaceListTargetOnCanvas}
        />
      </div>

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
          <div className="min-h-16 rounded-sm border border-dashed border-border bg-muted/10" aria-hidden />
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
