import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  type BeaconOnPage,
  findBeaconTargetsOnPage,
  type HydratedBeaconComponent,
  listInstancesInBeaconTarget,
} from "@/features/beacons/model/beacon-page-targets";
import {
  BEACON_UTILITIES_COMPONENT_GROUP,
  createBeaconListTargetComponent,
} from "@/features/beacons/model/create-beacon-list-target-component";
import { createBeaconTargetOnPage } from "@/features/beacons/model/create-beacon-target";
import {
  installBeaconsWrapperOnPage,
  isBeaconsWrapperInstalledOnPage,
  listBeaconsOrphanedOnBody,
} from "@/features/beacons/model/install-beacons-wrapper";
import {
  appendComponentToBeacon,
  listSiteComponentsForPicker,
  removeBeaconTargetFromPage,
  removeComponentInstanceFromCanvas,
} from "@/features/beacons/model/site-components";
import { BeaconCompositionPanel } from "@/features/beacons/ui/beacon-composition-panel";
import { BeaconHomePanel } from "@/features/beacons/ui/beacon-home-panel";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";

function formatDesignerError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Check that you can edit the current page.";
}

export function BeaconsScreen() {
  const nameFieldId = useId();
  const searchFieldId = useId();
  const [pageBeacons, setPageBeacons] = useState<BeaconOnPage[]>([]);
  const [pageScanLoading, setPageScanLoading] = useState(true);
  const [beaconsWrapperInstalled, setBeaconsWrapperInstalled] = useState(false);
  const [legacyBeaconsOnBody, setLegacyBeaconsOnBody] = useState<BeaconOnPage[]>([]);
  const [installPending, setInstallPending] = useState(false);

  const [beaconName, setBeaconName] = useState("");
  const [createPending, setCreatePending] = useState(false);
  const [createFormOpen, setCreateFormOpen] = useState(false);

  const [picking, setPicking] = useState(false);
  const [activeDataList, setActiveDataList] = useState<string | null>(null);

  const targetRef = useRef<BlockElement | null>(null);
  const [componentQuery, setComponentQuery] = useState("");
  const [componentCatalog, setComponentCatalog] = useState<ComponentSearchResult[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [addPending, setAddPending] = useState(false);
  const [selected, setSelected] = useState<HydratedBeaconComponent[]>([]);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [listTargetPending, setListTargetPending] = useState(false);
  const [openingBeaconKey, setOpeningBeaconKey] = useState<string | null>(null);
  const [beaconToDelete, setBeaconToDelete] = useState<BeaconOnPage | null>(null);
  const [deletePendingKey, setDeletePendingKey] = useState<string | null>(null);

  const refreshPageBeacons = useCallback(async () => {
    setPageScanLoading(true);
    try {
      const [found, installed, legacy] = await Promise.all([
        findBeaconTargetsOnPage(),
        isBeaconsWrapperInstalledOnPage(),
        listBeaconsOrphanedOnBody(),
      ]);
      setPageBeacons(found);
      setBeaconsWrapperInstalled(installed);
      setLegacyBeaconsOnBody(legacy);
    } catch {
      setPageBeacons([]);
      setBeaconsWrapperInstalled(false);
      setLegacyBeaconsOnBody([]);
    } finally {
      setPageScanLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPageBeacons();
  }, [refreshPageBeacons]);

  useEffect(() => {
    if (typeof webflow.subscribe !== "function") return undefined;
    return webflow.subscribe("currentpage", () => {
      setPicking(false);
      setCreateFormOpen(false);
      setActiveDataList(null);
      setSelected([]);
      targetRef.current = null;
      setBeaconName("");
      setListTargetPending(false);
      void refreshPageBeacons();
    });
  }, [refreshPageBeacons]);

  const runCatalogLoad = useCallback(async (q: string) => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const list = await listSiteComponentsForPicker(q);
      setComponentCatalog(list);
    } catch (err) {
      setCatalogError(formatDesignerError(err));
      setComponentCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!picking) return;
    const delayMs = componentQuery.trim() ? 280 : 0;
    const t = window.setTimeout(() => {
      void runCatalogLoad(componentQuery);
    }, delayMs);
    return () => window.clearTimeout(t);
  }, [picking, componentQuery, runCatalogLoad]);

  const exitToList = useCallback(() => {
    setPicking(false);
    setActiveDataList(null);
    targetRef.current = null;
    setComponentQuery("");
    setComponentCatalog([]);
    setSelected([]);
    setCatalogError(null);
    setBeaconName("");
    setCreateFormOpen(false);
    setListTargetPending(false);
    void refreshPageBeacons();
  }, [refreshPageBeacons]);

  const handleOpenBeacon = async (beacon: BeaconOnPage) => {
    setCreateFormOpen(false);
    setOpeningBeaconKey(beacon.key);
    try {
      const rows = await listInstancesInBeaconTarget(beacon.container);
      targetRef.current = beacon.container;
      setActiveDataList(beacon.dataList);
      setSelected(rows);
      setPicking(true);
    } catch (err) {
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setOpeningBeaconKey(null);
    }
  };

  const handleCreate = async () => {
    if (createPending) return;
    const trimmed = beaconName.trim();
    if (!trimmed) {
      void webflow.notify({ type: "Error", message: "Enter a name for the beacon." });
      return;
    }
    setCreatePending(true);
    try {
      const { container, dataList } = await createBeaconTargetOnPage(trimmed);
      targetRef.current = container;
      setActiveDataList(dataList);
      setSelected([]);
      setPicking(true);
      setCreateFormOpen(false);
      void webflow.notify({ type: "Success", message: "Beacon created." });
      void refreshPageBeacons();
    } catch (err) {
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setCreatePending(false);
    }
  };

  const selectedComponentIdSet = useMemo(() => new Set(selected.map((s) => s.componentId)), [selected]);

  const handleAddComponent = async (c: ComponentSearchResult) => {
    if (selectedComponentIdSet.has(c.id)) return;
    const container = targetRef.current;
    if (!container || addPending) return;
    setAddPending(true);
    try {
      const instance = await appendComponentToBeacon(container, c.id);
      setSelected((prev) => [...prev, { key: crypto.randomUUID(), componentId: c.id, name: c.name, instance }]);
      void refreshPageBeacons();
    } catch (err) {
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setAddPending(false);
    }
  };

  const handleInstallWrapper = async () => {
    if (installPending) return;
    setInstallPending(true);
    try {
      const r = await installBeaconsWrapperOnPage();
      const message = r.reparented
        ? `Installed. Moved ${r.reparented} beacon(s) into the wrapper.`
        : r.created
          ? "Installed."
          : "Already installed.";
      void webflow.notify({ type: "Success", message });
      try {
        await webflow.setSelectedElement(r.wrapper);
      } catch {
        /* selection is optional */
      }
      void refreshPageBeacons();
    } catch (err) {
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setInstallPending(false);
    }
  };

  const handleConfirmDeleteBeacon = async () => {
    if (deletePendingKey != null) return;
    const target = beaconToDelete;
    if (!target) return;
    setDeletePendingKey(target.key);
    try {
      await removeBeaconTargetFromPage(target.container);
      setBeaconToDelete(null);
      void webflow.notify({ type: "Success", message: "Beacon removed." });
      void refreshPageBeacons();
    } catch (err) {
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setDeletePendingKey(null);
    }
  };

  const handleRemove = async (row: HydratedBeaconComponent) => {
    if (removingKey) return;
    setRemovingKey(row.key);
    try {
      await removeComponentInstanceFromCanvas(row.instance);
      setSelected((prev) => prev.filter((p) => p.key !== row.key));
      void refreshPageBeacons();
    } catch (err) {
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setRemovingKey(null);
    }
  };

  const handleCreateListTarget = async () => {
    if (listTargetPending || activeDataList == null) return;
    const listContainer = targetRef.current;
    if (!listContainer) return;
    setListTargetPending(true);
    try {
      const created = await createBeaconListTargetComponent({
        dataList: activeDataList,
        listContainer,
      });
      const registeredName = await created.getName();
      void webflow.notify({
        type: "Success",
        message: `List target “${registeredName}” added under ${BEACON_UTILITIES_COMPONENT_GROUP}.`,
      });
    } catch (err) {
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setListTargetPending(false);
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {/* /beacons page title only. Global app bar is `Header` in the shell, not this strip. */}
      <div className="shrink-0 border-b border-border/50 bg-muted/20 dark:bg-muted/15" data-slot="beacons_route_header">
        <div className="mx-auto flex h-8 min-w-0 max-w-lg items-center justify-between gap-2 px-3">
          <h2 className="text-sm font-medium leading-none tracking-tight text-foreground">Beacons</h2>
          {beaconsWrapperInstalled ? (
            <div
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5"
              data-slot="beacon_install_done"
              role="status"
            >
              <span
                className="size-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]"
                aria-hidden
              />
              <span className="text-[0.65rem] font-medium leading-none text-emerald-800 dark:text-emerald-300">
                Installed
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-auto px-3 py-3">
        <div className="mx-auto w-full max-w-lg space-y-4">
          {!picking && (
            <BeaconHomePanel
              nameFieldId={nameFieldId}
              beaconsWrapperInstalled={beaconsWrapperInstalled}
              installPending={installPending}
              onInstallWrapper={handleInstallWrapper}
              legacyBeaconsOnBody={legacyBeaconsOnBody}
              pageBeacons={pageBeacons}
              pageScanLoading={pageScanLoading}
              beaconName={beaconName}
              setBeaconName={setBeaconName}
              createPending={createPending}
              createFormOpen={createFormOpen}
              setCreateFormOpen={setCreateFormOpen}
              onCreate={handleCreate}
              onOpenBeacon={handleOpenBeacon}
              openingBeaconKey={openingBeaconKey}
              onRequestDelete={(b) => setBeaconToDelete(b)}
              deletePendingKey={deletePendingKey}
            />
          )}

          {picking && (
            <BeaconCompositionPanel
              searchFieldId={searchFieldId}
              activeDataList={activeDataList}
              onBackToList={exitToList}
              componentQuery={componentQuery}
              setComponentQuery={setComponentQuery}
              catalogLoading={catalogLoading}
              catalogError={catalogError}
              componentCatalog={componentCatalog}
              selected={selected}
              selectedComponentIdSet={selectedComponentIdSet}
              addPending={addPending}
              onAddComponent={handleAddComponent}
              onRemove={handleRemove}
              removingKey={removingKey}
              onCreateListTarget={handleCreateListTarget}
              listTargetPending={listTargetPending}
            />
          )}

          <AlertDialog open={beaconToDelete != null} onOpenChange={(o) => !o && setBeaconToDelete(null)}>
            <AlertDialogContent size="default">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this beacon?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the hidden block
                  {beaconToDelete != null && (
                    <>
                      {" "}
                      <code className="font-mono text-[0.85em] text-foreground">{beaconToDelete.dataList}</code>
                    </>
                  )}{" "}
                  and any component instances inside it. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={deletePendingKey != null}
                  onClick={() => setBeaconToDelete(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deletePendingKey != null}
                  onClick={() => void handleConfirmDeleteBeacon()}
                >
                  {deletePendingKey != null ? "Deleting…" : "Delete"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
