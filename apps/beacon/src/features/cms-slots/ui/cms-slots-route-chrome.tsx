import { ChevronLeft, List, PanelsTopLeft, SquareCode } from "lucide-react";
import { type NavigateFunction, NavLink } from "react-router-dom";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import type { CmsSlotComposerRowMeta } from "@/features/cms-slots/model/cms-slot-composer-row-meta";
import type { CmsSlotEngineSlotPropsFile } from "@/features/cms-slots/model/cms-slot-engine-slot-props";
import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";
import type { CmsSlotListOnPage, HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import type { CmsSlotCompositionDraftRow, CmsSlotPaletteEntry } from "@/features/cms-slots/model/site-components";
import { useCmsSlotsAccess } from "@/features/cms-slots/model/use-cms-slots-access";
import { CmsSlotComposerListPanel } from "@/features/cms-slots/ui/cms-slot-composer-list-panel";
import { CmsSlotComposerStudioPanel } from "@/features/cms-slots/ui/cms-slot-composer-studio";
import { ComposerPaletteSection } from "@/features/cms-slots/ui/cms-slot-composer-studio/composer-palette-section";
import { CmsSlotCompositionPanel } from "@/features/cms-slots/ui/cms-slot-composition-panel";
import { CmsSlotHomePanel } from "@/features/cms-slots/ui/cms-slot-home-panel";
import { CmsSlotPageRuntimeHeaderStatus } from "@/features/cms-slots/ui/cms-slot-page-runtime-header-status";
import { beaconAppRouteSurfaceClass } from "@/shared/lib/beacon-app-route-surface";
import {
  CMS_SLOTS_AREA_NAV_LABEL,
  CMS_SLOTS_BACK_BUTTON_ARIA_LABEL,
  CMS_SLOTS_DELETE_DIALOG_TITLE,
  CMS_SLOTS_FEATURE_NAME,
  CMS_SLOTS_SYNC_REQUIRES_INSTALL_TOOLTIP,
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
import { ScrollArea } from "@/shared/ui/scroll-area";

export type CmsSlotsRouteChromeProps = {
  navigate: NavigateFunction;
  nameFieldId: string;
  searchFieldId: string;
  lastBeaconUninstallChoiceId: string;
  showPageRuntimeSyncHeader: boolean;
  pageRuntimeStatusLoading: boolean;
  syncShellOk: boolean;
  syncShellReason: string | undefined;
  isEngine: boolean;
  isComposer: boolean;
  picking: boolean;
  activeDataList: string | null;
  beaconsWrapperInstalled: boolean;
  installPending: boolean;
  pageBeacons: CmsSlotListOnPage[];
  pageScanLoading: boolean;
  beaconName: string;
  setBeaconName: (v: string) => void;
  createPending: boolean;
  createFormOpen: boolean;
  setCreateFormOpen: (v: boolean) => void;
  openingBeaconKey: string | null;
  deletePendingKey: string | null;
  setBeaconToDelete: (v: CmsSlotListOnPage | null) => void;
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
  onCreateListTarget: () => void | Promise<void>;
  onRequestRemoveListTarget: () => void;
  onPlaceListTargetOnCanvas: () => void | Promise<void>;
  listTargetCreatePending: boolean;
  listTargetRemovePending: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  engineListSlotFile: CmsSlotEngineSlotPropsFile | null;
  onSetEngineSlotExposed: (slotIndex: number, exposed: ComposableInstancePropMeta[]) => void | Promise<void>;
  onResyncEngineSlotAttrs: (slotIndex: number) => boolean | Promise<boolean>;
  resyncingEngineSlotKey: string | null;
  enginePublishedDisplayNames: string[] | null;
  onRenamePublishedDisplayName: (rowKey: string, nextName: string) => void | Promise<void>;
  renamingPublishedSlotKey: string | null;
  exitToList: () => void;
  composerEligibleLoading: boolean;
  composerRuntimeOk: boolean;
  composerEligible: CmsSlotListOnPage[];
  composerOpeningKey: string | null;
  onOpenComposerStudio: (b: CmsSlotListOnPage) => void | Promise<void>;
  onRefreshComposerEligible: () => void | Promise<void>;
  composerStudio: { beacon: CmsSlotListOnPage; initialSignature: string } | null;
  composerDraft: CmsSlotCompositionDraftRow[];
  composerDirty: boolean;
  composerAllowedPalette: CmsSlotPaletteEntry[];
  onComposerAddFromPalette: (c: CmsSlotPaletteEntry) => void;
  onComposerReorderDraft: (fromIndex: number, toIndex: number) => void;
  onComposerRemoveDraft: (key: string) => void;
  onComposerStudioBack: () => void;
  onComposerSave: (draftOverride?: CmsSlotCompositionDraftRow[]) => void | Promise<void>;
  composerSavePending: boolean;
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
};

function CmsSlotsRouteHeader(p: CmsSlotsRouteChromeProps) {
  return (
    <div className="shrink-0 border-b border-border/50 bg-muted/20 dark:bg-muted/15" data-slot="cms_slots_route_header">
      <div className="mx-auto flex h-8 min-w-0 max-w-lg items-center gap-2 px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="-ml-1 shrink-0 text-foreground"
          aria-label={CMS_SLOTS_BACK_BUTTON_ARIA_LABEL}
          onClick={() => void p.navigate("/home")}
        >
          <ChevronLeft aria-hidden className="size-4" strokeWidth={2.25} />
        </Button>
        <h2 className="min-w-0 truncate text-sm font-medium leading-none tracking-tight text-foreground">
          {CMS_SLOTS_FEATURE_NAME}
        </h2>
        <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-1.5">
          {p.showPageRuntimeSyncHeader && !p.isEngine ? (
            <CmsSlotPageRuntimeHeaderStatus
              loading={p.pageRuntimeStatusLoading}
              synced={p.syncShellOk}
              reason={p.syncShellReason}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CmsSlotsEngineRouteBody(p: CmsSlotsRouteChromeProps) {
  return (
    <div className="space-y-4" data-route="cms-slots-engine">
      {!p.picking ? (
        <CmsSlotHomePanel
          nameFieldId={p.nameFieldId}
          beaconsWrapperInstalled={p.beaconsWrapperInstalled}
          installPending={p.installPending}
          onInstallWrapper={p.onInstallWrapper}
          pageBeacons={p.pageBeacons}
          pageScanLoading={p.pageScanLoading}
          beaconName={p.beaconName}
          setBeaconName={p.setBeaconName}
          createPending={p.createPending}
          createFormOpen={p.createFormOpen}
          setCreateFormOpen={p.setCreateFormOpen}
          onCreate={p.onCreate}
          onOpenBeacon={p.onOpenBeacon}
          openingBeaconKey={p.openingBeaconKey}
          onRequestDelete={(b) => p.setBeaconToDelete(b)}
          deletePendingKey={p.deletePendingKey}
        />
      ) : null}

      {p.picking ? (
        <CmsSlotCompositionPanel
          searchFieldId={p.searchFieldId}
          activeDataList={p.activeDataList}
          onBackToList={p.exitToList}
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
          onCreateListTarget={p.onCreateListTarget}
          onRequestRemoveListTarget={p.onRequestRemoveListTarget}
          onPlaceListTargetOnCanvas={p.onPlaceListTargetOnCanvas}
          listTargetCreatePending={p.listTargetCreatePending}
          listTargetRemovePending={p.listTargetRemovePending}
          listTargetPlaceOnCanvasPending={p.listTargetPlaceOnCanvasPending}
          engineSlotProps={p.engineListSlotFile ?? { v: 1, slots: [] }}
          onSetSlotExposed={p.onSetEngineSlotExposed}
          onResyncEngineSlotAttrs={p.onResyncEngineSlotAttrs}
          resyncingEngineSlotKey={p.resyncingEngineSlotKey}
          enginePublishedDisplayNames={p.enginePublishedDisplayNames}
          onRenamePublishedDisplayName={p.onRenamePublishedDisplayName}
          renamingPublishedSlotKey={p.renamingPublishedSlotKey}
        />
      ) : null}
    </div>
  );
}

function CmsSlotsComposerRouteBody(p: CmsSlotsRouteChromeProps) {
  return (
    <div className="space-y-4" data-route="cms-slots-composer">
      {p.composerStudio == null ? (
        <CmsSlotComposerListPanel
          pageScanLoading={p.pageScanLoading}
          beaconsWrapperInstalled={p.beaconsWrapperInstalled}
          installPending={p.installPending}
          onInstallWrapper={p.onInstallWrapper}
          loading={p.composerEligibleLoading}
          runtimeOk={p.composerRuntimeOk && p.syncShellOk}
          eligible={p.composerEligible}
          openingKey={p.composerOpeningKey}
          onOpenList={(b) => void p.onOpenComposerStudio(b)}
          onRefresh={() => void p.onRefreshComposerEligible()}
        />
      ) : (
        <CmsSlotComposerStudioPanel
          activeDataList={p.composerStudio.beacon.dataList}
          draft={p.composerDraft}
          dirty={p.composerDirty}
          allowedPalette={p.composerAllowedPalette}
          onAddFromPalette={p.onComposerAddFromPalette}
          onReorder={p.onComposerReorderDraft}
          onRemove={p.onComposerRemoveDraft}
          onBack={p.onComposerStudioBack}
          onSave={(draftOverride) => void p.onComposerSave(draftOverride)}
          savePending={p.composerSavePending}
          embedSyncPending={p.embedSyncPending}
          rowMeta={p.composerRowMeta}
          onChangePropValue={p.onComposerSetPropValue}
          onRenameSlot={p.onComposerRenameSlotRow}
          omitPalette
        />
      )}
    </div>
  );
}

function CmsSlotsRouteScrollBody(p: CmsSlotsRouteChromeProps) {
  return (
    <ScrollArea className="min-h-0 min-w-0 flex-1">
      <div className="mx-auto w-full max-w-lg space-y-4 px-3 py-3">
        {p.isEngine ? <CmsSlotsEngineRouteBody {...p} /> : p.isComposer ? <CmsSlotsComposerRouteBody {...p} /> : null}
      </div>
    </ScrollArea>
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
  const syncNeedsFooterAttention =
    p.showPageRuntimeSyncHeader &&
    !p.syncShellOk &&
    !p.pageRuntimeStatusLoading &&
    !p.embedSyncPending &&
    !p.pageScanLoading;

  const syncButton = (
    <Button
      type="button"
      variant={syncNeedsFooterAttention ? "default" : "secondary"}
      size="dockNav"
      className={composerOnly ? "min-w-0 flex-1" : undefined}
      disabled={p.embedSyncPending || p.pageRuntimeStatusLoading || !p.beaconsWrapperInstalled || p.pageScanLoading}
      aria-busy={p.embedSyncPending}
      title={
        !p.beaconsWrapperInstalled
          ? CMS_SLOTS_SYNC_REQUIRES_INSTALL_TOOLTIP
          : p.pageRuntimeStatusLoading
            ? "Checking page script…"
            : syncNeedsFooterAttention
              ? (p.syncShellReason ?? "Sync to update the embedded page script.")
              : undefined
      }
      onClick={() => void p.onSyncInstallEmbed()}
    >
      <SquareCode aria-hidden />
      Sync
    </Button>
  );

  if (composerOnly) {
    return (
      <footer
        data-slot="cms_slots_dock"
        data-composer-only=""
        className="flex shrink-0 items-stretch border-t border-border/65 bg-background px-3 pt-2 pb-[max(env(safe-area-inset-bottom,0px),0.375rem)]"
      >
        {syncButton}
      </footer>
    );
  }

  return (
    <footer
      data-slot="cms_slots_dock"
      className="flex shrink-0 items-stretch gap-2 border-t border-border/65 bg-background px-3 pt-2 pb-[max(env(safe-area-inset-bottom,0px),0.375rem)]"
    >
      <nav className="flex min-w-0 flex-1 items-stretch gap-1.5" aria-label={CMS_SLOTS_AREA_NAV_LABEL}>
        <NavLink
          to="/cms-slots/engine"
          className={({ isActive }) =>
            cn(
              buttonVariants({
                variant: isActive ? "cmsSlotsDockNavActive" : "cmsSlotsDockNav",
                size: "dockNav",
              }),
              "min-w-0 flex-1 shrink"
            )
          }
          onClick={() => {
            if (p.composerStudio != null) {
              p.onComposerStudioBack();
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
                variant: isActive ? "cmsSlotsDockNavActive" : "cmsSlotsDockNav",
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
    </footer>
  );
}

/** Route shell/header, scroll region, dialogs, footer — splits cognitive complexity off `CmsSlotsScreen`. */
export function CmsSlotsRouteChrome(p: CmsSlotsRouteChromeProps) {
  const composerPaletteDocked = p.isComposer && p.composerStudio != null;

  return (
    <div className={beaconAppRouteSurfaceClass}>
      <CmsSlotsRouteHeader {...p} />
      <CmsSlotsRouteScrollBody {...p} />
      <CmsSlotsBeaconDeleteDialog {...p} />
      <CmsSlotsRemoveListTargetDialog {...p} />
      {composerPaletteDocked ? (
        <ComposerPaletteSection
          variant="docked"
          allowedPalette={p.composerAllowedPalette}
          busy={p.composerSavePending || p.embedSyncPending}
          onAddFromPalette={p.onComposerAddFromPalette}
        />
      ) : null}
      <CmsSlotsRouteDock {...p} />
    </div>
  );
}
