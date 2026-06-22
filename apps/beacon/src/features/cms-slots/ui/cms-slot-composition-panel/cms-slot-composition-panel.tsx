import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import type { CmsSlotDesignerSlotPropsFile } from "@/features/cms-slots/model/cms-slot-designer-slot-props";
import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";
import { cmsSlotListTargetPhaseUnsettled } from "@/features/cms-slots/model/cms-slot-list-target-settled";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import type { CmsComposerEditingContextViewModel } from "@/features/cms-slots/model/use-cms-composer-editing-context-state";
import { CmsSlotsComposerEditingContextCard } from "@/features/cms-slots/ui/cms-slots-composer-editing-context-card";
import {
  CMS_SLOTS_DESIGNER_COMPONENTS_LABEL,
  CMS_SLOTS_DESIGNER_EDITING_DESCRIPTION,
  CMS_SLOTS_DESIGNER_EDITING_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";
import {
  SurfaceSummaryCardPageIntro,
  SurfaceSummaryCardPanelSectionLabel,
  SurfaceSummaryCardSurfaceSummary,
} from "@/shared/ui/surface-summary-card";
import { CmsSlotCompositionComponentsCatalogSheet } from "./cms-slot-composition-components-catalog-sheet";
import { CmsSlotDesignerComponentsEmptyState } from "./cms-slot-designer-components-empty-state";
import { CmsSlotDesignerListContextSection } from "./cms-slot-designer-list-context-section";
import { CmsSlotDesignerSelectedComponentsList } from "./cms-slot-designer-selected-components-list";
import { useCompositionComposableMeta } from "./use-composition-composable-meta";

export type CmsSlotCompositionPanelProps = {
  composerEditingContext: CmsComposerEditingContextViewModel;
  activeListLabel: string | null;
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
  onSetSeedVariant: (row: HydratedCmsSlotRow, propId: string, variantId: string) => void | Promise<void>;
  settingVariantKey: string | null;
  onAddVariant: (row: HydratedCmsSlotRow) => void | Promise<void>;
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
  designerSlotProps: CmsSlotDesignerSlotPropsFile;
  onSetSlotExposed: (slotIndex: number, exposed: ComposableInstancePropMeta[]) => void;
  /** Re-apply `data-cb-c` content tags on the component definition from current Designer “Expose” + bindings. */
  onResyncDesignerSlotAttrs: (slotIndex: number) => boolean | Promise<boolean>;
  resyncingDesignerSlotKey: string | null;
  /** Index-aligned with `selected`; from runtime JSON `n[]` (null while loading). */
  designerPublishedDisplayNames: string[] | null;
  onRenamePublishedDisplayName: (rowKey: string, nextName: string) => void;
  renamingPublishedSlotKey: string | null;
  autoOpenExposeDrawerRowKey?: string | null;
  onAutoOpenExposeDrawerConsumed?: () => void;
};

export function CmsSlotCompositionPanel(props: CmsSlotCompositionPanelProps) {
  const {
    composerEditingContext,
    activeListLabel,
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
    onSetSeedVariant,
    settingVariantKey,
    onAddVariant,
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
    designerSlotProps,
    onSetSlotExposed,
    onResyncDesignerSlotAttrs,
    resyncingDesignerSlotKey,
    designerPublishedDisplayNames,
    onRenamePublishedDisplayName,
    renamingPublishedSlotKey,
    autoOpenExposeDrawerRowKey = null,
    onAutoOpenExposeDrawerConsumed,
  } = props;

  const listTargetActionBusy =
    listTargetCreatePending ||
    listTargetRemovePending ||
    listTargetFocusOnCanvasPending ||
    listTargetPlaceOnCanvasPending ||
    cmsSlotListTargetPhaseUnsettled(listTargetPhase, listTargetOnCanvasCountResolved);

  const { composableByKey, composableLoading } = useCompositionComposableMeta(selected);

  return (
    <>
      <SurfaceSummaryCardPageIntro
        title={CMS_SLOTS_DESIGNER_EDITING_TITLE}
        description={CMS_SLOTS_DESIGNER_EDITING_DESCRIPTION}
      />

      <CmsSlotsComposerEditingContextCard
        context={composerEditingContext}
        primaryField="collection"
        slotListLabel={activeListLabel}
      />

      <CmsSlotDesignerListContextSection
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
        <SurfaceSummaryCardPanelSectionLabel>{CMS_SLOTS_DESIGNER_COMPONENTS_LABEL}</SurfaceSummaryCardPanelSectionLabel>
        {selected.length === 0 ? (
          <CmsSlotDesignerComponentsEmptyState />
        ) : (
          <CmsSlotDesignerSelectedComponentsList
            selected={selected}
            composableByKey={composableByKey}
            composableLoading={composableLoading}
            designerSlotProps={designerSlotProps}
            designerPublishedDisplayNames={designerPublishedDisplayNames}
            onRenamePublishedDisplayName={onRenamePublishedDisplayName}
            renamingPublishedSlotKey={renamingPublishedSlotKey}
            addPending={addPending}
            removingKey={removingKey}
            listTargetActionBusy={listTargetActionBusy}
            resyncingDesignerSlotKey={resyncingDesignerSlotKey}
            onRemove={onRemove}
            onSetSeedVariant={onSetSeedVariant}
            settingVariantKey={settingVariantKey}
            onAddVariant={onAddVariant}
            onSetSlotExposed={onSetSlotExposed}
            onResyncDesignerSlotAttrs={onResyncDesignerSlotAttrs}
            autoOpenExposeDrawerRowKey={autoOpenExposeDrawerRowKey}
            onAutoOpenExposeDrawerConsumed={onAutoOpenExposeDrawerConsumed}
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
