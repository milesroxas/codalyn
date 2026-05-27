import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import type { CmsSlotEngineSlotPropsFile } from "@/features/cms-slots/model/cms-slot-engine-slot-props";
import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import { CMS_SLOTS_ENGINE_COMPONENTS_LABEL } from "@/shared/lib/cms-slots-feature-copy";
import {
  SurfaceSummaryCardPanelSectionLabel,
  SurfaceSummaryCardSurfaceSummary,
} from "@/shared/ui/surface-summary-card";
import { CmsSlotCompositionComponentsCatalogSheet } from "./cms-slot-composition-components-catalog-sheet";
import { CmsSlotEngineComponentsEmptyState } from "./cms-slot-engine-components-empty-state";
import { CmsSlotEngineListContextSection } from "./cms-slot-engine-list-context-section";
import { CmsSlotEngineSelectedComponentsList } from "./cms-slot-engine-selected-components-list";
import { useCompositionComposableMeta } from "./use-composition-composable-meta";

export type CmsSlotCompositionPanelProps = {
  searchFieldId: string;
  activeDataList: string | null;
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
  /** False until the on-page list target instance count has been resolved for the current list. */
  listTargetOnCanvasCountResolved: boolean;
  onCreateListTarget: () => void;
  onRequestRemoveListTarget: () => void;
  onFocusListTargetOnCanvas: () => void;
  onPlaceListTargetOnCanvas: () => void;
  listTargetCreatePending: boolean;
  listTargetRemovePending: boolean;
  listTargetFocusOnCanvasPending: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  listTargetSelectedOnCanvas: boolean;
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
    listTargetSelectedOnCanvas,
    listTargetOnCanvasCount,
    listTargetOnCanvasCountResolved,
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
    listTargetPhase === "updating" ||
    (listTargetPhase === "synced" && !listTargetOnCanvasCountResolved);

  const { composableByKey, composableLoading } = useCompositionComposableMeta(selected);

  return (
    <>
      <CmsSlotEngineListContextSection
        activeDataList={activeDataList}
        listTargetActionBusy={listTargetActionBusy}
        listTargetCreatePending={listTargetCreatePending}
        listTargetOnCanvasCount={listTargetOnCanvasCount}
        listTargetOnCanvasCountResolved={listTargetOnCanvasCountResolved}
        listTargetPhase={listTargetPhase}
        listTargetFocusOnCanvasPending={listTargetFocusOnCanvasPending}
        listTargetPlaceOnCanvasPending={listTargetPlaceOnCanvasPending}
        listTargetSelectedOnCanvas={listTargetSelectedOnCanvas}
        listTargetRemovePending={listTargetRemovePending}
        onCreateListTarget={onCreateListTarget}
        onFocusListTargetOnCanvas={onFocusListTargetOnCanvas}
        onPlaceListTargetOnCanvas={onPlaceListTargetOnCanvas}
        onRequestRemoveListTarget={onRequestRemoveListTarget}
        removingKey={removingKey}
      />

      <SurfaceSummaryCardSurfaceSummary>
        <SurfaceSummaryCardPanelSectionLabel>{CMS_SLOTS_ENGINE_COMPONENTS_LABEL}</SurfaceSummaryCardPanelSectionLabel>
        {selected.length === 0 ? (
          <CmsSlotEngineComponentsEmptyState />
        ) : (
          <CmsSlotEngineSelectedComponentsList
            selected={selected}
            composableByKey={composableByKey}
            composableLoading={composableLoading}
            engineSlotProps={engineSlotProps}
            enginePublishedDisplayNames={enginePublishedDisplayNames}
            onRenamePublishedDisplayName={onRenamePublishedDisplayName}
            renamingPublishedSlotKey={renamingPublishedSlotKey}
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
        )}
        <CmsSlotCompositionComponentsCatalogSheet
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
      </SurfaceSummaryCardSurfaceSummary>
    </>
  );
}
