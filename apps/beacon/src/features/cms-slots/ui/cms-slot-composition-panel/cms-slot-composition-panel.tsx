import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import type { CmsSlotEngineSlotPropsFile } from "@/features/cms-slots/model/cms-slot-engine-slot-props";
import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import { SectionLabelDivider } from "@/shared/ui/section-label-divider";
import { CmsSlotCompositionComponentsCatalog } from "./cms-slot-composition-components-catalog";
import { CmsSlotEngineListContextSection } from "./cms-slot-engine-list-context-section";
import { CmsSlotEngineSelectedRow } from "./cms-slot-engine-selected-row";
import { useCompositionComposableMeta } from "./use-composition-composable-meta";

export type CmsSlotCompositionPanelProps = {
  searchFieldId: string;
  activeDataList: string | null;
  activeListLabel: string | null;
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
  onFocusListTargetOnCanvas: () => void;
  onPlaceListTargetOnCanvas: () => void;
  listTargetCreatePending: boolean;
  listTargetRemovePending: boolean;
  listTargetFocusOnCanvasPending: boolean;
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
  autoOpenExposeDrawerRowKey?: string | null;
  onAutoOpenExposeDrawerConsumed?: () => void;
  /** False while route loading overlay is visible or exiting — defer auto-open until idle. */
  routeInteractionIdle?: boolean;
};

export function CmsSlotCompositionPanel(props: CmsSlotCompositionPanelProps) {
  const {
    searchFieldId,
    activeDataList,
    activeListLabel,
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
    onFocusListTargetOnCanvas,
    onPlaceListTargetOnCanvas,
    listTargetCreatePending,
    listTargetRemovePending,
    listTargetFocusOnCanvasPending,
    listTargetPlaceOnCanvasPending,
    listTargetOnCanvasCount,
    engineSlotProps,
    onSetSlotExposed,
    onResyncEngineSlotAttrs,
    resyncingEngineSlotKey,
    enginePublishedDisplayNames,
    onRenamePublishedDisplayName,
    renamingPublishedSlotKey,
    autoOpenExposeDrawerRowKey = null,
    onAutoOpenExposeDrawerConsumed,
    routeInteractionIdle = true,
  } = props;

  const listTargetActionBusy =
    listTargetCreatePending ||
    listTargetRemovePending ||
    listTargetFocusOnCanvasPending ||
    listTargetPlaceOnCanvasPending ||
    listTargetPhase === "loading" ||
    listTargetPhase === "updating";

  const { composableByKey, composableLoading } = useCompositionComposableMeta(selected);

  return (
    <>
      <CmsSlotEngineListContextSection
        activeDataList={activeDataList}
        activeListLabel={activeListLabel}
        listTargetActionBusy={listTargetActionBusy}
        listTargetCreatePending={listTargetCreatePending}
        listTargetOnCanvasCount={listTargetOnCanvasCount}
        listTargetPhase={listTargetPhase}
        listTargetFocusOnCanvasPending={listTargetFocusOnCanvasPending}
        listTargetPlaceOnCanvasPending={listTargetPlaceOnCanvasPending}
        listTargetRemovePending={listTargetRemovePending}
        onBackToList={onBackToList}
        onCreateListTarget={onCreateListTarget}
        onFocusListTargetOnCanvas={onFocusListTargetOnCanvas}
        onPlaceListTargetOnCanvas={onPlaceListTargetOnCanvas}
        onRequestRemoveListTarget={onRequestRemoveListTarget}
        removingKey={removingKey}
      />

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
        <SectionLabelDivider label="Components" variant="plain" lineTone="default" />
        {selected.length === 0 ? (
          <div className="min-h-16 rounded-[10px] border border-dashed border-border bg-muted/10" aria-hidden />
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-border/70 bg-card text-card-foreground shadow-sm">
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
                  composableMetaReady={!composableLoading && row.key in composableByKey}
                  addPending={addPending}
                  removingKey={removingKey}
                  listTargetActionBusy={listTargetActionBusy}
                  resyncingEngineSlotKey={resyncingEngineSlotKey}
                  onRemove={onRemove}
                  onSetSlotExposed={onSetSlotExposed}
                  onResyncEngineSlotAttrs={onResyncEngineSlotAttrs}
                  autoOpenExposeDrawerRowKey={autoOpenExposeDrawerRowKey}
                  onAutoOpenExposeDrawerConsumed={onAutoOpenExposeDrawerConsumed}
                  routeInteractionIdle={routeInteractionIdle}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
