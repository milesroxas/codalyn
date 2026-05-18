import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import type { CmsSlotEngineSlotPropsFile } from "@/features/cms-slots/model/cms-slot-engine-slot-props";
import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import { CmsSlotCompositionComponentsCatalog } from "./cms-slot-composition-components-catalog";
import { CmsSlotEngineSelectedRow } from "./cms-slot-engine-selected-row";
import { CmsSlotListTargetActionsBar } from "./cms-slot-list-target-actions-bar";
import { useCompositionComposableMeta } from "./use-composition-composable-meta";

export type CmsSlotCompositionPanelProps = {
  searchFieldId: string;
  activeDataList: string | null;
  onBackToList: () => void;
  componentQuery: string;
  setComponentQuery: (q: string) => void;
  catalogLoading: boolean;
  catalogError: string | null;
  componentCatalog: ComponentSearchResult[];
  selected: HydratedCmsSlotRow[];
  selectedComponentIdSet: Set<string>;
  addPending: boolean;
  onAddComponent: (c: ComponentSearchResult) => void;
  onRemove: (row: HydratedCmsSlotRow) => void;
  removingKey: string | null;
  listTargetPhase: CmsSlotListTargetPhase;
  /** How many list-render target instances for this list exist on the current page. */
  listTargetOnCanvasCount: number;
  onCreateListTarget: () => void;
  onRequestRemoveListTarget: () => void;
  onPlaceListTargetOnCanvas: () => void;
  listTargetCreatePending: boolean;
  listTargetRemovePending: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  engineSlotProps: CmsSlotEngineSlotPropsFile;
  onSetSlotExposed: (slotIndex: number, exposed: ComposableInstancePropMeta[]) => void;
  /** Re-apply `data-codalyn-beacon-prop` on the component definition from current Engine “Expose” + bindings. */
  onResyncEngineSlotAttrs: (slotIndex: number) => boolean | Promise<boolean>;
  resyncingEngineSlotKey: string | null;
  /** Index-aligned with `selected`; from runtime JSON `n[]` (null while loading). */
  enginePublishedDisplayNames: string[] | null;
  onRenamePublishedDisplayName: (rowKey: string, nextName: string) => void;
  renamingPublishedSlotKey: string | null;
};

export function CmsSlotCompositionPanel(props: CmsSlotCompositionPanelProps) {
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
    enginePublishedDisplayNames,
    onRenamePublishedDisplayName,
    renamingPublishedSlotKey,
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
        <CmsSlotListTargetActionsBar
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

      <CmsSlotCompositionComponentsCatalog
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
        <div className="flex items-center gap-3">
          <div className="h-px min-w-0 flex-1 bg-zinc-600/45" aria-hidden />
          <span className="shrink-0 text-center text-xs text-zinc-500">Components</span>
          <div className="h-px min-w-0 flex-1 bg-zinc-600/45" aria-hidden />
        </div>
        {selected.length === 0 ? (
          <div className="min-h-16 rounded-[10px] border border-dashed border-zinc-700/55 bg-zinc-900/40" aria-hidden />
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-zinc-700/55 bg-[#1c1c1c]">
            <ul
              className="scrollbar-themed max-h-60 divide-y divide-border/80 overflow-y-scroll"
              aria-label="Selected components"
            >
              {selected.map((row, slotIndex) => (
                <CmsSlotEngineSelectedRow
                  key={row.key}
                  row={row}
                  slotIndex={slotIndex}
                  publishedDisplayName={enginePublishedDisplayNames?.[slotIndex] ?? row.name}
                  onRenamePublishedDisplayName={onRenamePublishedDisplayName}
                  renamingPublishedSlotKey={renamingPublishedSlotKey}
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
          </div>
        )}
      </div>
    </>
  );
}
