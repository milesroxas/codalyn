import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { List, PanelsTopLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { type NavigateFunction, NavLink } from "react-router-dom";
import {
  BeaconFeatureRouteChrome,
  BeaconFeatureRouteDockButton,
  BeaconFeatureRouteFooter,
  BeaconFeatureRouteScrollBody,
} from "@/app/ui/beacon-feature-route-chrome";
import { BeaconRouteContentTransition } from "@/app/ui/beacon-route-content-transition";
import { BeaconRouteLoadingOverlay } from "@/app/ui/beacon-route-loading-overlay";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import type { CmsSlotComposerRowMeta } from "@/features/cms-slots/model/cms-slot-composer-row-meta";
import { displayLabelForCmsSlotList } from "@/features/cms-slots/model/cms-slot-data-list-display";
import type { CmsSlotDesignerSlotPropsFile } from "@/features/cms-slots/model/cms-slot-designer-slot-props";
import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";
import type { CmsSlotListOnPage, HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import {
  resolveCmsSlotsComposerRouteSurface,
  resolveCmsSlotsDesignerRouteSurface,
} from "@/features/cms-slots/model/cms-slots-panel-content-key";
import { cmsSlotsRouteInteractionBlocked } from "@/features/cms-slots/model/cms-slots-route-interaction";
import { type CmsSlotsRouteTaskInput, resolveCmsSlotsRouteTask } from "@/features/cms-slots/model/cms-slots-route-task";
import type { CmsSlotCompositionDraftRow, CmsSlotPaletteEntry } from "@/features/cms-slots/model/site-components";
import type { CmsComposerEditingContextViewModel } from "@/features/cms-slots/model/use-cms-composer-editing-context-state";
import { useCmsSlotsAccess } from "@/features/cms-slots/model/use-cms-slots-access";
import { CmsSlotComposerListPanel } from "@/features/cms-slots/ui/cms-slot-composer-list-panel";
import { CmsSlotComposerPanel } from "@/features/cms-slots/ui/cms-slot-composer-panel";
import { ComposerUnsavedChangesDialog } from "@/features/cms-slots/ui/cms-slot-composer-panel/composer-unsaved-changes-dialog";
import { CmsSlotCompositionPanel } from "@/features/cms-slots/ui/cms-slot-composition-panel";
import { CmsSlotHomePanel } from "@/features/cms-slots/ui/cms-slot-home-panel";
import {
  CmsSlotsCmsFieldLinkDialog,
  type CmsSlotsCmsFieldLinkDialogVariant,
} from "@/features/cms-slots/ui/cms-slots-cms-field-link-dialog";
import { CmsSlotsPageRuntimeSyncButton } from "@/features/cms-slots/ui/cms-slots-page-runtime-sync-button";
import { CmsSlotsRouteInteractionProvider } from "@/features/cms-slots/ui/cms-slots-route-interaction-context";
import {
  CMS_SLOTS_AREA_NAV_LABEL,
  CMS_SLOTS_DELETE_DIALOG_TITLE,
  CMS_SLOTS_ROUTE_TASK_SAVING_COMPOSITION,
  CMS_SLOTS_SCAN_ARIA_LABEL,
  CMS_SLOTS_UNINSTALL_PAGE_HINT,
  CMS_SLOTS_UNINSTALL_PAGE_LABEL,
} from "@/shared/lib/cms-slots-feature-copy";
import { cn } from "@/shared/lib/utils";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button, buttonVariants } from "@/shared/ui/button";
import { CheckboxField } from "@/shared/ui/checkbox-field";

export type CmsSlotsRouteChromeProps = {
  navigate: NavigateFunction;
  nameFieldId: string;
  searchFieldId: string;
  lastBeaconUninstallChoiceId: string;
  pageRuntimeSyncRelevant: boolean;
  pageRuntimeStatusLoading: boolean;
  syncShellOk: boolean;
  syncShellReason: string | undefined;
  isDesigner: boolean;
  isComposer: boolean;
  picking: boolean;
  activeDataList: string | null;
  activeListLabel: string | null;
  beaconsWrapperInstalled: boolean;
  installPending: boolean;
  pageBeacons: CmsSlotListOnPage[];
  pageScanLoading: boolean;
  pageBootBlocking: boolean;
  routeTaskPhase: string | null;
  slotPropsWritePending: boolean;
  routeStateKnown: boolean;
  beaconName: string;
  setBeaconName: (v: string) => void;
  createPending: boolean;
  createFormOpen: boolean;
  setCreateFormOpen: (v: boolean) => void;
  openingBeaconKey: string | null;
  deletePendingKey: string | null;
  renamePendingKey: string | null;
  setBeaconToDelete: (v: CmsSlotListOnPage | null) => void;
  onRenameBeacon: (b: CmsSlotListOnPage, nextDisplayName: string) => boolean | Promise<boolean>;
  onCreate: () => void | Promise<void>;
  onOpenBeacon: (b: CmsSlotListOnPage) => void;
  onInstallWrapper: () => void | Promise<void>;
  componentQuery: string;
  setComponentQuery: (v: string) => void;
  catalogLoading: boolean;
  catalogError: string | null;
  componentCatalog: ComponentSearchResult[];
  selected: HydratedCmsSlotRow[];
  selectedComponentIdSet: Set<string>;
  addPending: boolean;
  onAddComponent: (c: ComponentSearchResult) => void | Promise<void>;
  onRemoveRow: (row: HydratedCmsSlotRow) => void | Promise<void>;
  removingKey: string | null;
  onSetSeedVariant: (row: HydratedCmsSlotRow, propId: string, variantId: string) => void | Promise<void>;
  settingVariantKey: string | null;
  onAddVariant: (row: HydratedCmsSlotRow) => void | Promise<void>;
  listTargetPhase: CmsSlotListTargetPhase;
  listTargetOnCanvasCount: number;
  listTargetOnCanvasCountResolved: boolean;
  onCreateListTarget: () => void | Promise<void>;
  onRequestRemoveListTarget: () => void;
  onFocusListTargetOnCanvas: () => void | Promise<void>;
  onPlaceListTargetOnCanvas: () => void | Promise<void>;
  listTargetCreatePending: boolean;
  listTargetRemovePending: boolean;
  listTargetFocusOnCanvasPending: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  listTargetSelectedOnCanvas: boolean;
  designerListSlotFile: CmsSlotDesignerSlotPropsFile | null;
  onSetDesignerSlotExposed: (slotIndex: number, exposed: ComposableInstancePropMeta[]) => void | Promise<void>;
  onResyncDesignerSlotAttrs: (slotIndex: number, compositionChanged?: boolean) => boolean | Promise<boolean>;
  resyncingDesignerSlotKey: string | null;
  designerPublishedDisplayNames: string[] | null;
  onRenamePublishedDisplayName: (rowKey: string, nextName: string) => void | Promise<void>;
  renamingPublishedSlotKey: string | null;
  autoOpenExposeDrawerRowKey: string | null;
  onAutoOpenExposeDrawerConsumed: () => void;
  pendingSeedRowKey: string | null;
  onDiscardPendingSeed: (row: HydratedCmsSlotRow) => void;
  exitToList: () => void;
  composerEligibleLoading: boolean;
  composerEligibleResolved: boolean;
  composerRuntimeOk: boolean;
  composerEligible: CmsSlotListOnPage[];
  composerOpeningKey: string | null;
  onOpenComposer: (b: CmsSlotListOnPage) => void | Promise<void>;
  activeComposer: { beacon: CmsSlotListOnPage; initialSignature: string } | null;
  composerDraft: CmsSlotCompositionDraftRow[];
  composerDirty: boolean;
  composerAllowedPalette: CmsSlotPaletteEntry[];
  onComposerAddFromPalette: (c: CmsSlotPaletteEntry) => void;
  onComposerReorderDraft: (fromIndex: number, toIndex: number) => void;
  onComposerRemoveDraft: (key: string) => void;
  onComposerBack: () => void;
  onRequestNavigateToDesigner: () => void;
  onEditorNoSlotsBack: () => void;
  onComposerSave: (draftOverride?: CmsSlotCompositionDraftRow[]) => Promise<boolean>;
  composerSavePending: boolean;
  composerLeaveDialogOpen: boolean;
  setComposerLeaveDialogOpen: (open: boolean) => void;
  onComposerLeaveDiscard: () => void;
  onComposerLeaveSave: () => void | Promise<void>;
  onSyncInstallEmbed: () => void | Promise<void>;
  embedSyncPending: boolean;
  composerRowMeta: CmsSlotComposerRowMeta[];
  onComposerSetPropValue: (rowKey: string, propId: string, value: string) => void;
  onComposerRenameSlotRow: (rowKey: string, name: string) => void;
  composerEditingContext: CmsComposerEditingContextViewModel;
  beaconToDelete: CmsSlotListOnPage | null;
  isLastCmsSlotListOnPageForDelete: boolean;
  uninstallWithLastBeaconDelete: boolean;
  setUninstallWithLastBeaconDelete: (v: boolean) => void;
  onConfirmDeleteBeacon: () => void | Promise<void>;
  removeListTargetDialogOpen: boolean;
  setRemoveListTargetDialogOpen: (v: boolean) => void;
  listTargetRemoveBusyKind: "canvas" | "delete" | null;
  setListTargetRemoveBusyKind: (v: "canvas" | "delete" | null) => void;
  onRemoveListTargetFromCanvasOnly: () => void | Promise<void>;
  onConfirmDeleteListTargetCompletely: () => void | Promise<void>;
  cmsFieldLinkPromptOpen: boolean;
  cmsFieldLinkPromptVariant: CmsSlotsCmsFieldLinkDialogVariant;
  cmsFieldLinkNavReady: boolean;
  cmsFieldLinkRetryPending: boolean;
  onCmsFieldLinkPromptOpenChange: (open: boolean) => void;
  onRetryCmsFieldLink: () => void | Promise<void>;
};

function cmsSlotsRouteTaskInputFromChromeProps(p: CmsSlotsRouteChromeProps): CmsSlotsRouteTaskInput {
  return {
    pageBootBlocking: p.pageBootBlocking,
    routeTaskPhase: p.routeTaskPhase,
    picking: p.picking,
    addPending: p.addPending,
    resyncingDesignerSlotKey: p.resyncingDesignerSlotKey,
    listTargetCreatePending: p.listTargetCreatePending,
    listTargetFocusOnCanvasPending: p.listTargetFocusOnCanvasPending,
    listTargetPlaceOnCanvasPending: p.listTargetPlaceOnCanvasPending,
    listTargetRemovePending: p.listTargetRemovePending,
    slotPropsWritePending: p.slotPropsWritePending,
    embedSyncPending: p.embedSyncPending,
    composerSavePending: p.composerSavePending,
    removingKey: p.removingKey,
    deletePendingKey: p.deletePendingKey,
    createPending: p.createPending,
    cmsFieldLinkRetryPending: p.cmsFieldLinkRetryPending,
  };
}

function CmsSlotsDesignerRouteBody(
  p: CmsSlotsRouteChromeProps & {
    contentKey: ReturnType<typeof resolveCmsSlotsDesignerRouteSurface>["contentKey"];
  }
) {
  let panel: ReactNode;
  if (p.contentKey === "composition") {
    panel = (
      <div className="space-y-4" data-route="cms-slots-designer-composition">
        <CmsSlotCompositionPanel
          composerEditingContext={p.composerEditingContext}
          onBackToList={p.exitToList}
          activeListLabel={p.activeListLabel}
          searchFieldId={p.searchFieldId}
          activeDataList={p.activeDataList}
          componentQuery={p.componentQuery}
          setComponentQuery={p.setComponentQuery}
          catalogLoading={p.catalogLoading}
          catalogError={p.catalogError}
          componentCatalog={p.componentCatalog}
          selected={p.selected}
          selectedComponentIdSet={p.selectedComponentIdSet}
          addPending={p.addPending}
          onAddComponent={p.onAddComponent}
          onRemove={p.onRemoveRow}
          removingKey={p.removingKey}
          onSetSeedVariant={p.onSetSeedVariant}
          settingVariantKey={p.settingVariantKey}
          onAddVariant={p.onAddVariant}
          listTargetPhase={p.listTargetPhase}
          listTargetOnCanvasCount={p.listTargetOnCanvasCount}
          listTargetOnCanvasCountResolved={p.listTargetOnCanvasCountResolved}
          onCreateListTarget={p.onCreateListTarget}
          onRequestRemoveListTarget={p.onRequestRemoveListTarget}
          onFocusListTargetOnCanvas={p.onFocusListTargetOnCanvas}
          onPlaceListTargetOnCanvas={p.onPlaceListTargetOnCanvas}
          listTargetCreatePending={p.listTargetCreatePending}
          listTargetRemovePending={p.listTargetRemovePending}
          listTargetFocusOnCanvasPending={p.listTargetFocusOnCanvasPending}
          listTargetPlaceOnCanvasPending={p.listTargetPlaceOnCanvasPending}
          listTargetSelectedOnCanvas={p.listTargetSelectedOnCanvas}
          designerSlotProps={p.designerListSlotFile ?? { v: 1, slots: [] }}
          onSetSlotExposed={p.onSetDesignerSlotExposed}
          onResyncDesignerSlotAttrs={p.onResyncDesignerSlotAttrs}
          resyncingDesignerSlotKey={p.resyncingDesignerSlotKey}
          designerPublishedDisplayNames={p.designerPublishedDisplayNames}
          onRenamePublishedDisplayName={p.onRenamePublishedDisplayName}
          renamingPublishedSlotKey={p.renamingPublishedSlotKey}
          autoOpenExposeDrawerRowKey={p.autoOpenExposeDrawerRowKey}
          onAutoOpenExposeDrawerConsumed={p.onAutoOpenExposeDrawerConsumed}
          pendingSeedRowKey={p.pendingSeedRowKey}
          onDiscardPendingSeed={p.onDiscardPendingSeed}
        />
      </div>
    );
  } else {
    panel = (
      <div className="space-y-4" data-route="cms-slots-designer-home">
        <CmsSlotHomePanel
          composerEditingContext={p.composerEditingContext}
          nameFieldId={p.nameFieldId}
          beaconsWrapperInstalled={p.beaconsWrapperInstalled}
          installPending={p.installPending}
          onInstallWrapper={p.onInstallWrapper}
          pageBeacons={p.pageBeacons}
          pageScanLoading={p.pageScanLoading}
          routeStateKnown={p.routeStateKnown}
          beaconName={p.beaconName}
          setBeaconName={p.setBeaconName}
          createPending={p.createPending}
          createFormOpen={p.createFormOpen}
          setCreateFormOpen={p.setCreateFormOpen}
          onCreate={p.onCreate}
          onOpenBeacon={p.onOpenBeacon}
          openingBeaconKey={p.openingBeaconKey}
          onRequestDelete={(b) => p.setBeaconToDelete(b)}
          onRenameBeacon={p.onRenameBeacon}
          deletePendingKey={p.deletePendingKey}
          renamePendingKey={p.renamePendingKey}
        />
      </div>
    );
  }

  return <div data-route="cms-slots-designer">{panel}</div>;
}

function CmsSlotsComposerRouteBody(
  p: CmsSlotsRouteChromeProps & {
    contentKey: ReturnType<typeof resolveCmsSlotsComposerRouteSurface>["contentKey"];
  }
) {
  const { composerOnly } = useCmsSlotsAccess();

  let panel: ReactNode;
  if (p.contentKey === "composer" && p.activeComposer != null) {
    const activeComposer = p.activeComposer;
    panel = (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col" data-route="cms-slots-composer-editor">
        <CmsSlotComposerPanel
          activeListLabel={displayLabelForCmsSlotList(activeComposer.beacon)}
          composerEditingContext={p.composerEditingContext}
          draft={p.composerDraft}
          dirty={p.composerDirty}
          allowedPalette={p.composerAllowedPalette}
          onAddFromPalette={p.onComposerAddFromPalette}
          onReorder={p.onComposerReorderDraft}
          onRemove={p.onComposerRemoveDraft}
          onBack={p.onComposerBack}
          onSave={(draftOverride) => void p.onComposerSave(draftOverride)}
          savePending={p.composerSavePending}
          embedSyncPending={p.embedSyncPending}
          rowMeta={p.composerRowMeta}
          onChangePropValue={p.onComposerSetPropValue}
          onRenameSlot={p.onComposerRenameSlotRow}
          autoOpenEditDialogRowKey={p.autoOpenExposeDrawerRowKey}
          onAutoOpenEditDialogConsumed={p.onAutoOpenExposeDrawerConsumed}
          composerOnly={composerOnly}
        />
      </div>
    );
  } else {
    panel = (
      <div className="space-y-4" data-route="cms-slots-composer-list">
        <CmsSlotComposerListPanel
          composerEditingContext={p.composerEditingContext}
          pageBootBlocking={p.pageBootBlocking}
          pageRuntimeStatusLoading={p.pageRuntimeStatusLoading}
          routeStateKnown={p.routeStateKnown}
          composerEligibleResolved={p.composerEligibleResolved}
          beaconsWrapperInstalled={p.beaconsWrapperInstalled}
          loading={p.composerEligibleLoading}
          runtimeOk={p.composerRuntimeOk && p.syncShellOk}
          eligible={p.composerEligible}
          openingKey={p.composerOpeningKey}
          onOpenList={(b) => void p.onOpenComposer(b)}
          onEditorNoSlotsBack={p.onEditorNoSlotsBack}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col" data-route="cms-slots-composer">
      {panel}
    </div>
  );
}

/**
 * Picks the active route body and a transition key that encodes both the segment and the in-segment content
 * key (e.g. `composer:list`). Keeping the key segment-qualified lets the single content transition treat a
 * designer→composer move as an ordinary keyed swap (fade out, then in) instead of an instant unmount.
 */
function resolveCmsSlotsRouteContent(
  p: CmsSlotsRouteChromeProps,
  designerSurface: ReturnType<typeof resolveCmsSlotsDesignerRouteSurface> | null,
  composerSurface: ReturnType<typeof resolveCmsSlotsComposerRouteSurface> | null
): { contentKey: string; body: ReactNode } {
  if (designerSurface != null) {
    return {
      contentKey: `designer:${designerSurface.contentKey}`,
      body: <CmsSlotsDesignerRouteBody {...p} contentKey={designerSurface.contentKey} />,
    };
  }
  if (composerSurface != null) {
    return {
      contentKey: `composer:${composerSurface.contentKey}`,
      body: <CmsSlotsComposerRouteBody {...p} contentKey={composerSurface.contentKey} />,
    };
  }
  return { contentKey: "empty", body: null };
}

function CmsSlotsRouteScrollBody(p: CmsSlotsRouteChromeProps) {
  const routeTask = resolveCmsSlotsRouteTask(cmsSlotsRouteTaskInputFromChromeProps(p));
  const routeBlocking = routeTask != null;
  const [overlayBlocking, setOverlayBlocking] = useState(false);

  const designerSurface = p.isDesigner
    ? resolveCmsSlotsDesignerRouteSurface({
        picking: p.picking,
        openingBeaconKey: p.openingBeaconKey,
        routeStateKnown: p.routeStateKnown,
        pageBootBlocking: p.pageBootBlocking,
      })
    : null;
  const composerSurface = p.isComposer
    ? resolveCmsSlotsComposerRouteSurface({
        activeComposer: p.activeComposer,
        composerOpeningKey: p.composerOpeningKey,
        routeStateKnown: p.routeStateKnown,
        pageBootBlocking: p.pageBootBlocking,
        pageRuntimeStatusLoading: p.pageRuntimeStatusLoading,
        composerEligibleLoading: p.composerEligibleLoading,
        composerEligibleResolved: p.composerEligibleResolved,
      })
    : null;
  const surfaceReady = designerSurface?.contentReady ?? composerSurface?.contentReady ?? true;
  // Never strand the user on a blank panel: the loader covers explicit route tasks AND any surface still
  // resolving (content held at opacity 0 by the transition). Deferred 200ms so fast swaps fade silently —
  // only a genuinely slow load (segment data scan, beacon open) ever surfaces chrome instead of blank.
  const overlayBusy = routeBlocking || !surfaceReady;
  const showOverlay = useDeferredLoadingIndicator(overlayBusy);
  const routeInteractionBlocked = cmsSlotsRouteInteractionBlocked({
    routeBlocking,
    surfaceReady,
    overlayBlocking,
  });

  const composerEditorFill = p.isComposer && p.activeComposer != null;

  // One transition surface drives every panel swap — home↔composition, list↔editor, and crossing the
  // designer/composer segments. A segment change fades out the outgoing panel before mounting the incoming
  // one, instead of unmounting it instantly (which flashed a blank/wrong view between the two route bodies).
  const { contentKey: routeContentKey, body: routeBody } = resolveCmsSlotsRouteContent(
    p,
    designerSurface,
    composerSurface
  );

  return (
    <BeaconFeatureRouteScrollBody
      scrollable={!composerEditorFill}
      flushX={composerEditorFill}
      // pb-0 drops the route's bottom inset so the editor's scroll region meets the footer (no gap); the scroll
      // content keeps its own pb-3 scroll-end breathing room inside the viewport.
      contentClassName={composerEditorFill ? "h-full min-h-0 overflow-hidden pb-0" : undefined}
      overlay={
        <BeaconRouteLoadingOverlay
          visible={overlayBusy}
          deferredVisible={showOverlay}
          onOccupancyChange={setOverlayBlocking}
          ariaLabel={routeTask?.ariaLabel ?? CMS_SLOTS_SCAN_ARIA_LABEL}
          message={routeTask?.message}
        />
      }
    >
      <CmsSlotsRouteInteractionProvider blocked={routeInteractionBlocked}>
        <div
          className={cn("flex min-h-0 min-w-0 flex-1 flex-col", routeInteractionBlocked && "pointer-events-none")}
          aria-hidden={routeInteractionBlocked}
        >
          <BeaconRouteContentTransition contentKey={routeContentKey} contentReady={surfaceReady}>
            {routeBody}
          </BeaconRouteContentTransition>
        </div>
      </CmsSlotsRouteInteractionProvider>
    </BeaconFeatureRouteScrollBody>
  );
}

function CmsSlotsBeaconDeleteDialog(p: CmsSlotsRouteChromeProps) {
  return (
    <AlertDialog open={p.beaconToDelete != null} onOpenChange={(o) => !o && p.setBeaconToDelete(null)}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>{CMS_SLOTS_DELETE_DIALOG_TITLE}</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        {p.isLastCmsSlotListOnPageForDelete ? (
          <div
            className="max-w-sm rounded-sm border border-border/70 bg-muted/25 p-2.5 sm:max-w-none"
            data-slot="cms_slots_delete_uninstall_page"
          >
            <CheckboxField
              id={p.lastBeaconUninstallChoiceId}
              label={CMS_SLOTS_UNINSTALL_PAGE_LABEL}
              checked={p.uninstallWithLastBeaconDelete}
              disabled={p.deletePendingKey != null}
              onCheckedChange={p.setUninstallWithLastBeaconDelete}
            />
            <p className="mt-2 text-xs leading-snug text-muted-foreground">{CMS_SLOTS_UNINSTALL_PAGE_HINT}</p>
          </div>
        ) : null}
        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={p.deletePendingKey != null}
            onClick={() => p.setBeaconToDelete(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={p.deletePendingKey != null}
            onClick={() => void p.onConfirmDeleteBeacon()}
          >
            {p.deletePendingKey != null ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CmsSlotsRemoveListTargetDialog(p: CmsSlotsRouteChromeProps) {
  return (
    <AlertDialog
      open={p.removeListTargetDialogOpen}
      onOpenChange={(o) => {
        if (!o && !p.listTargetRemovePending) {
          p.setRemoveListTargetDialogOpen(false);
          p.setListTargetRemoveBusyKind(null);
        }
      }}
    >
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove list target</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            Confirm removing the list target from the canvas or deleting it entirely.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-wrap">
          <AlertDialogCancel type="button" disabled={p.listTargetRemovePending}>
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            variant="outline"
            disabled={p.listTargetRemovePending}
            onClick={() => void p.onRemoveListTargetFromCanvasOnly()}
          >
            {p.listTargetRemovePending && p.listTargetRemoveBusyKind === "canvas" ? "Removing…" : "Remove from canvas"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={p.listTargetRemovePending}
            onClick={() => void p.onConfirmDeleteListTargetCompletely()}
          >
            {p.listTargetRemovePending && p.listTargetRemoveBusyKind === "delete" ? "Deleting…" : "Delete target"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CmsSlotsRouteDock(p: CmsSlotsRouteChromeProps) {
  const { composerOnly } = useCmsSlotsAccess();

  const composerSavePending = p.composerSavePending || p.embedSyncPending;
  const routeTask = resolveCmsSlotsRouteTask(cmsSlotsRouteTaskInputFromChromeProps(p));
  const composerSaveLabel =
    composerSavePending && routeTask != null
      ? routeTask.message
      : composerSavePending
        ? CMS_SLOTS_ROUTE_TASK_SAVING_COMPOSITION
        : "Save";

  const syncButton = (
    <CmsSlotsPageRuntimeSyncButton
      relevant={p.pageRuntimeSyncRelevant}
      synced={p.syncShellOk}
      reason={p.syncShellReason}
      statusLoading={p.pageRuntimeStatusLoading}
      embedSyncPending={p.embedSyncPending}
      beaconsWrapperInstalled={p.beaconsWrapperInstalled}
      pageScanLoading={p.pageScanLoading}
      onSync={p.onSyncInstallEmbed}
    />
  );

  const composerSaveButton =
    p.activeComposer != null ? (
      <BeaconFeatureRouteDockButton
        type="button"
        stretch
        emphasized={p.composerDirty}
        disabled={!p.composerDirty || composerSavePending}
        aria-busy={p.composerSavePending}
        onClick={() => void p.onComposerSave()}
      >
        {composerSaveLabel}
      </BeaconFeatureRouteDockButton>
    ) : null;

  if (composerOnly) {
    if (composerSaveButton == null) {
      return null;
    }
    return (
      <BeaconFeatureRouteFooter dataSlot="cms_slots_dock" data-composer-only="" layout="dockActions">
        {composerSaveButton}
      </BeaconFeatureRouteFooter>
    );
  }

  return (
    <BeaconFeatureRouteFooter dataSlot="cms_slots_dock" layout="dockActions">
      <nav className="flex min-w-0 flex-1 items-stretch gap-1.5" aria-label={CMS_SLOTS_AREA_NAV_LABEL}>
        <NavLink
          to="/cms-slots/designer"
          className={({ isActive }) =>
            cn(
              buttonVariants({
                variant: isActive ? "routeDockActive" : "routeDockMuted",
                size: "dockNav",
              }),
              "min-w-0 flex-1 shrink"
            )
          }
          onClick={(event) => {
            if (p.activeComposer != null) {
              event.preventDefault();
              p.onRequestNavigateToDesigner();
            }
          }}
        >
          <PanelsTopLeft aria-hidden />
          Designer
        </NavLink>
        <NavLink
          to="/cms-slots/composer"
          className={({ isActive }) =>
            cn(
              buttonVariants({
                variant: isActive ? "routeDockActive" : "routeDockMuted",
                size: "dockNav",
              }),
              "min-w-0 flex-1 shrink"
            )
          }
          onClick={() => {
            if (p.picking) {
              p.exitToList();
            }
          }}
        >
          <List aria-hidden />
          Composer
        </NavLink>
      </nav>
      {syncButton}
    </BeaconFeatureRouteFooter>
  );
}

/** Route shell/header, scroll region, dialogs, footer — splits cognitive complexity off `CmsSlotsScreen`. */
export function CmsSlotsRouteChrome(p: CmsSlotsRouteChromeProps) {
  return (
    <BeaconFeatureRouteChrome
      overlays={
        <>
          <CmsSlotsBeaconDeleteDialog {...p} />
          <CmsSlotsRemoveListTargetDialog {...p} />
          <CmsSlotsCmsFieldLinkDialog
            open={p.cmsFieldLinkPromptOpen}
            variant={p.cmsFieldLinkPromptVariant}
            navReady={p.cmsFieldLinkNavReady}
            retryPending={p.cmsFieldLinkRetryPending}
            onOpenChange={p.onCmsFieldLinkPromptOpenChange}
            onRetryLink={p.onRetryCmsFieldLink}
          />
          <ComposerUnsavedChangesDialog
            open={p.composerLeaveDialogOpen}
            busy={p.composerSavePending}
            onOpenChange={p.setComposerLeaveDialogOpen}
            onDiscard={p.onComposerLeaveDiscard}
            onSave={() => void p.onComposerLeaveSave()}
          />
        </>
      }
      footer={<CmsSlotsRouteDock {...p} />}
    >
      <CmsSlotsRouteScrollBody {...p} />
    </BeaconFeatureRouteChrome>
  );
}
