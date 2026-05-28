import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { List, PanelsTopLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { type NavigateFunction, NavLink } from "react-router-dom";
import {
  BeaconFeatureRouteChrome,
  BeaconFeatureRouteDockButton,
  BeaconFeatureRouteFooter,
  BeaconFeatureRouteHeader,
  BeaconFeatureRouteScrollBody,
  BeaconFeatureRouteSubheader,
} from "@/app/ui/beacon-feature-route-chrome";
import { BeaconRouteContentTransition } from "@/app/ui/beacon-route-content-transition";
import { BeaconRouteLoadingOverlay } from "@/app/ui/beacon-route-loading-overlay";
import { BeaconRouteLoadingShell } from "@/app/ui/beacon-route-loading-shell";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import type { CmsSlotComposerRowMeta } from "@/features/cms-slots/model/cms-slot-composer-row-meta";
import { displayLabelForCmsSlotList } from "@/features/cms-slots/model/cms-slot-data-list-display";
import type { CmsSlotEngineSlotPropsFile } from "@/features/cms-slots/model/cms-slot-engine-slot-props";
import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";
import type { CmsSlotListOnPage, HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import {
  cmsSlotsComposerRouteContentKey,
  cmsSlotsEngineRouteContentKey,
} from "@/features/cms-slots/model/cms-slots-panel-content-key";
import { type CmsSlotsRouteTaskInput, resolveCmsSlotsRouteTask } from "@/features/cms-slots/model/cms-slots-route-task";
import type { CmsSlotCompositionDraftRow, CmsSlotPaletteEntry } from "@/features/cms-slots/model/site-components";
import { useCmsSlotsAccess } from "@/features/cms-slots/model/use-cms-slots-access";
import { CmsSlotComposerListPanel } from "@/features/cms-slots/ui/cms-slot-composer-list-panel";
import { CmsSlotComposerPanel } from "@/features/cms-slots/ui/cms-slot-composer-panel";
import { ComposerPaletteSection } from "@/features/cms-slots/ui/cms-slot-composer-panel/composer-palette-section";
import { ComposerUnsavedChangesDialog } from "@/features/cms-slots/ui/cms-slot-composer-panel/composer-unsaved-changes-dialog";
import { CmsSlotCompositionPanel } from "@/features/cms-slots/ui/cms-slot-composition-panel";
import { CmsSlotEngineBackToListDock } from "@/features/cms-slots/ui/cms-slot-composition-panel/cms-slot-engine-back-to-list-dock";
import { CmsSlotHomePanel } from "@/features/cms-slots/ui/cms-slot-home-panel";
import { CmsSlotsCmsFieldLinkDialog } from "@/features/cms-slots/ui/cms-slots-cms-field-link-dialog";
import { CmsSlotsPageRuntimeSyncButton } from "@/features/cms-slots/ui/cms-slots-page-runtime-sync-button";
import {
  CMS_SLOTS_AREA_NAV_LABEL,
  CMS_SLOTS_DELETE_DIALOG_TITLE,
  CMS_SLOTS_ENGINE_EDITING_TITLE,
  CMS_SLOTS_ENGINE_MAIN_TITLE,
  CMS_SLOTS_ENGINE_STEP_NAV_ARIA_LABEL,
  CMS_SLOTS_FEATURE_NAME,
  CMS_SLOTS_OPENING_ARIA_LABEL,
  CMS_SLOTS_OPENING_MESSAGE,
  CMS_SLOTS_ROUTE_TASK_SAVING_COMPOSITION,
  CMS_SLOTS_SCAN_ARIA_LABEL,
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
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { StepNav } from "@/shared/ui/step-nav";

export type CmsSlotsRouteChromeProps = {
  navigate: NavigateFunction;
  nameFieldId: string;
  searchFieldId: string;
  lastBeaconUninstallChoiceId: string;
  pageRuntimeSyncRelevant: boolean;
  pageRuntimeStatusLoading: boolean;
  syncShellOk: boolean;
  syncShellReason: string | undefined;
  isEngine: boolean;
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
  engineListSlotFile: CmsSlotEngineSlotPropsFile | null;
  onSetEngineSlotExposed: (slotIndex: number, exposed: ComposableInstancePropMeta[]) => void | Promise<void>;
  onResyncEngineSlotAttrs: (slotIndex: number) => boolean | Promise<boolean>;
  resyncingEngineSlotKey: string | null;
  enginePublishedDisplayNames: string[] | null;
  onRenamePublishedDisplayName: (rowKey: string, nextName: string) => void | Promise<void>;
  renamingPublishedSlotKey: string | null;
  autoOpenExposeDrawerRowKey: string | null;
  onAutoOpenExposeDrawerConsumed: () => void;
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
  cmsFieldLinkNavReady: boolean;
  cmsFieldLinkRetryPending: boolean;
  setCmsFieldLinkPromptOpen: (v: boolean) => void;
  onRetryCmsFieldLink: () => void | Promise<void>;
};

function cmsSlotsRouteTaskInputFromChromeProps(p: CmsSlotsRouteChromeProps): CmsSlotsRouteTaskInput {
  return {
    pageBootBlocking: p.pageBootBlocking,
    routeTaskPhase: p.routeTaskPhase,
    openingBeaconKey: p.openingBeaconKey,
    composerOpeningKey: p.composerOpeningKey,
    isComposer: p.isComposer,
    picking: p.picking,
    activeComposer: p.activeComposer,
    composerEligibleLoading: p.composerEligibleLoading,
    addPending: p.addPending,
    resyncingEngineSlotKey: p.resyncingEngineSlotKey,
    listTargetCreatePending: p.listTargetCreatePending,
    listTargetFocusOnCanvasPending: p.listTargetFocusOnCanvasPending,
    listTargetPlaceOnCanvasPending: p.listTargetPlaceOnCanvasPending,
    listTargetRemovePending: p.listTargetRemovePending,
    listTargetPhase: p.listTargetPhase,
    listTargetOnCanvasCountResolved: p.listTargetOnCanvasCountResolved,
    slotPropsWritePending: p.slotPropsWritePending,
    embedSyncPending: p.embedSyncPending,
    composerSavePending: p.composerSavePending,
    removingKey: p.removingKey,
    deletePendingKey: p.deletePendingKey,
    createPending: p.createPending,
    cmsFieldLinkRetryPending: p.cmsFieldLinkRetryPending,
  };
}

function CmsSlotsEngineRouteBody(p: CmsSlotsRouteChromeProps & { routeInteractionIdle?: boolean }) {
  const showOpeningLoader = useDeferredLoadingIndicator(p.openingBeaconKey != null);
  const contentKey = cmsSlotsEngineRouteContentKey({
    picking: p.picking,
    openingBeaconKey: showOpeningLoader ? p.openingBeaconKey : null,
  });

  let panel: ReactNode;
  if (contentKey === "opening") {
    panel = (
      <BeaconRouteLoadingShell
        ariaLabel={CMS_SLOTS_OPENING_ARIA_LABEL}
        message={CMS_SLOTS_OPENING_MESSAGE}
        dataSlot="cms_slots_engine_opening"
      />
    );
  } else if (contentKey === "composition") {
    panel = (
      <div className="space-y-4" data-route="cms-slots-engine-composition">
        <CmsSlotCompositionPanel
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
          engineSlotProps={p.engineListSlotFile ?? { v: 1, slots: [] }}
          onSetSlotExposed={p.onSetEngineSlotExposed}
          onResyncEngineSlotAttrs={p.onResyncEngineSlotAttrs}
          resyncingEngineSlotKey={p.resyncingEngineSlotKey}
          enginePublishedDisplayNames={p.enginePublishedDisplayNames}
          onRenamePublishedDisplayName={p.onRenamePublishedDisplayName}
          renamingPublishedSlotKey={p.renamingPublishedSlotKey}
          autoOpenExposeDrawerRowKey={p.autoOpenExposeDrawerRowKey}
          onAutoOpenExposeDrawerConsumed={p.onAutoOpenExposeDrawerConsumed}
          routeInteractionIdle={p.routeInteractionIdle ?? true}
        />
      </div>
    );
  } else {
    panel = (
      <div className="space-y-4" data-route="cms-slots-engine-home">
        <CmsSlotHomePanel
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

  return (
    <div data-route="cms-slots-engine">
      <BeaconRouteContentTransition contentKey={contentKey}>{panel}</BeaconRouteContentTransition>
    </div>
  );
}

function CmsSlotsComposerRouteBody(p: CmsSlotsRouteChromeProps) {
  const { composerOnly } = useCmsSlotsAccess();
  const showOpeningLoader = useDeferredLoadingIndicator(p.composerOpeningKey != null);
  const contentKey = cmsSlotsComposerRouteContentKey({
    activeComposer: p.activeComposer,
    composerOpeningKey: showOpeningLoader ? p.composerOpeningKey : null,
  });

  let panel: ReactNode;
  if (contentKey === "opening") {
    panel = (
      <BeaconRouteLoadingShell
        ariaLabel={CMS_SLOTS_OPENING_ARIA_LABEL}
        message={CMS_SLOTS_OPENING_MESSAGE}
        dataSlot="cms_slots_composer_opening"
      />
    );
  } else if (contentKey === "composer" && p.activeComposer != null) {
    const activeComposer = p.activeComposer;
    panel = (
      <div className="space-y-4" data-route="cms-slots-composer-editor">
        <CmsSlotComposerPanel
          activeListLabel={displayLabelForCmsSlotList(activeComposer.beacon)}
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
          omitPalette
          composerOnly={composerOnly}
        />
      </div>
    );
  } else {
    panel = (
      <div className="space-y-4" data-route="cms-slots-composer-list">
        <CmsSlotComposerListPanel
          pageScanLoading={p.pageScanLoading}
          pageRuntimeStatusLoading={p.pageRuntimeStatusLoading}
          routeStateKnown={p.routeStateKnown}
          composerEligibleResolved={p.composerEligibleResolved}
          beaconsWrapperInstalled={p.beaconsWrapperInstalled}
          loading={p.composerEligibleLoading}
          runtimeOk={p.composerRuntimeOk && p.syncShellOk}
          eligible={p.composerEligible}
          openingKey={p.composerOpeningKey}
          onOpenList={(b) => void p.onOpenComposer(b)}
        />
      </div>
    );
  }

  return (
    <div data-route="cms-slots-composer">
      <BeaconRouteContentTransition contentKey={contentKey}>{panel}</BeaconRouteContentTransition>
    </div>
  );
}

function CmsSlotsRouteScrollBody(p: CmsSlotsRouteChromeProps) {
  const routeTask = resolveCmsSlotsRouteTask(cmsSlotsRouteTaskInputFromChromeProps(p));
  const routeBlocking = routeTask != null;
  const showRouteBlocking = useDeferredLoadingIndicator(routeBlocking);
  const [overlayOccupied, setOverlayOccupied] = useState(false);
  const suppressRouteContent = showRouteBlocking || overlayOccupied;
  const routeInteractionIdle = !suppressRouteContent;

  return (
    <BeaconFeatureRouteScrollBody
      overlay={
        <BeaconRouteLoadingOverlay
          visible={routeBlocking}
          deferredVisible={showRouteBlocking}
          onOccupancyChange={setOverlayOccupied}
          ariaLabel={routeTask?.ariaLabel ?? CMS_SLOTS_SCAN_ARIA_LABEL}
          message={routeTask?.message}
        />
      }
    >
      <div
        className={cn("flex min-h-0 min-w-0 flex-1 flex-col", suppressRouteContent && "pointer-events-none invisible")}
        aria-hidden={suppressRouteContent}
      >
        {p.isEngine ? (
          <CmsSlotsEngineRouteBody {...p} routeInteractionIdle={routeInteractionIdle} />
        ) : p.isComposer ? (
          <CmsSlotsComposerRouteBody {...p} />
        ) : null}
      </div>
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
            className="flex max-w-sm gap-2.5 rounded-sm border border-border/70 bg-muted/25 p-2.5 sm:max-w-none"
            data-slot="cms_slots_delete_uninstall_page"
          >
            <Checkbox
              id={p.lastBeaconUninstallChoiceId}
              checked={p.uninstallWithLastBeaconDelete}
              disabled={p.deletePendingKey != null}
              onCheckedChange={(v) => p.setUninstallWithLastBeaconDelete(v === true)}
            />
            <div className="min-w-0">
              <Label htmlFor={p.lastBeaconUninstallChoiceId}>{CMS_SLOTS_UNINSTALL_PAGE_LABEL}</Label>
            </div>
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
          to="/cms-slots/engine"
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
              p.onComposerBack();
            }
          }}
        >
          <PanelsTopLeft aria-hidden />
          Engine
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

type CmsSlotsEngineStepId = "engine-home" | "configure";

/** Route shell/header, scroll region, dialogs, footer — splits cognitive complexity off `CmsSlotsScreen`. */
export function CmsSlotsRouteChrome(p: CmsSlotsRouteChromeProps) {
  const composerPaletteDocked = p.isComposer && p.activeComposer != null;
  const engineBackToListDocked = p.isEngine && p.picking;
  const engineStepNav =
    p.isEngine && p.picking ? (
      <StepNav<CmsSlotsEngineStepId>
        aria-label={CMS_SLOTS_ENGINE_STEP_NAV_ARIA_LABEL}
        current="configure"
        onStepSelect={(step) => {
          if (step === "engine-home") {
            p.exitToList();
          }
        }}
        steps={[
          { id: "engine-home", label: CMS_SLOTS_ENGINE_MAIN_TITLE },
          { id: "configure", label: p.activeListLabel ?? CMS_SLOTS_ENGINE_EDITING_TITLE },
        ]}
      />
    ) : null;

  return (
    <BeaconFeatureRouteChrome
      header={<BeaconFeatureRouteHeader title={CMS_SLOTS_FEATURE_NAME} dataSlot="cms_slots_route_header" />}
      subheader={
        engineStepNav ? (
          <BeaconFeatureRouteSubheader dataSlot="cms_slots_engine_step_nav">
            {engineStepNav}
          </BeaconFeatureRouteSubheader>
        ) : null
      }
      overlays={
        <>
          <CmsSlotsBeaconDeleteDialog {...p} />
          <CmsSlotsRemoveListTargetDialog {...p} />
          <CmsSlotsCmsFieldLinkDialog
            open={p.cmsFieldLinkPromptOpen}
            navReady={p.cmsFieldLinkNavReady}
            retryPending={p.cmsFieldLinkRetryPending}
            onOpenChange={p.setCmsFieldLinkPromptOpen}
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
      footer={
        <>
          {engineBackToListDocked ? <CmsSlotEngineBackToListDock onBackToList={p.exitToList} /> : null}
          {composerPaletteDocked ? (
            <ComposerPaletteSection
              variant="docked"
              allowedPalette={p.composerAllowedPalette}
              busy={p.composerSavePending || p.embedSyncPending}
              onAddFromPalette={p.onComposerAddFromPalette}
            />
          ) : null}
          <CmsSlotsRouteDock {...p} />
        </>
      }
    >
      <CmsSlotsRouteScrollBody {...p} />
    </BeaconFeatureRouteChrome>
  );
}
