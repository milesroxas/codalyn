import { type MutableRefObject, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { listComposerEligibleLists } from "@/features/beacons/model/beacon-composer-eligible";
import {
  clearAllBeaconListTargetDesignerPreviewsOnPage,
  resyncAllBeaconListTargetDesignerPreviewsOnPage,
  syncBeaconListTargetDesignerPreview,
} from "@/features/beacons/model/beacon-list-target-designer-preview";
import { listBeaconListTargetInstancesOnPage } from "@/features/beacons/model/beacon-list-target-instances-on-page";
import {
  getBeaconPageRuntimeSyncStatus,
  syncBeaconPageInlineScript,
} from "@/features/beacons/model/beacon-page-inline-script";
import {
  type BeaconOnPage,
  beaconTargetKey,
  findBeaconTargetsOnPage,
  type HydratedBeaconComponent,
  listInstancesInBeaconTarget,
} from "@/features/beacons/model/beacon-page-targets";
import {
  BEACON_UTILITIES_COMPONENT_GROUP,
  createBeaconListTargetComponent,
  getBeaconListTargetComponentOrNull,
} from "@/features/beacons/model/create-beacon-list-target-component";
import { createBeaconTargetOnPage } from "@/features/beacons/model/create-beacon-target";
import {
  installBeaconsWrapperOnPage,
  isBeaconsWrapperInstalledOnPage,
  listBeaconsOrphanedOnBody,
  syncBeaconsInstallEmbedOnPage,
} from "@/features/beacons/model/install-beacons-wrapper";
import { placeBeaconListTargetOnCanvas } from "@/features/beacons/model/place-beacon-list-target-on-canvas";
import { reconcileBeaconListTargetForOpen } from "@/features/beacons/model/reconcile-beacon-list-target";
import {
  appendComponentToBeacon,
  applyBeaconCompositionDraft,
  type BeaconCompositionDraftRow,
  listSiteComponentsForPicker,
  removeBeaconTargetFromPage,
  removeComponentInstanceFromCanvas,
} from "@/features/beacons/model/site-components";
import { BeaconComposerListPanel } from "@/features/beacons/ui/beacon-composer-list-panel";
import { BeaconComposerStudioPanel } from "@/features/beacons/ui/beacon-composer-studio-panel";
import { BeaconCompositionPanel } from "@/features/beacons/ui/beacon-composition-panel";
import { BeaconHomePanel } from "@/features/beacons/ui/beacon-home-panel";
import { BeaconPageRuntimeHeaderStatus } from "@/features/beacons/ui/beacon-page-runtime-header-status";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

function formatDesignerError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Check that you can edit the current page.";
}

async function runListTargetReconcileOnOpen(
  myGen: number,
  listTargetResolveGen: MutableRefObject<number>,
  activeDataList: string,
  listContainer: BlockElement,
  setListTargetPhase: (p: "loading" | "absent" | "synced" | "updating") => void,
  setListTargetRegisteredName: (n: string | null) => void
) {
  const stale = () => listTargetResolveGen.current !== myGen;
  setListTargetPhase("updating");
  try {
    if (stale()) return;
    const o = await reconcileBeaconListTargetForOpen(activeDataList, listContainer);
    if (stale()) return;
    for (const t of o.toasts) {
      void webflow.notify(t);
    }
    setListTargetRegisteredName(o.displayName);
    setListTargetPhase(o.phase);
  } catch (e) {
    if (stale()) return;
    setListTargetPhase("absent");
    void webflow.notify({ type: "Error", message: formatDesignerError(e) });
  }
}

export function BeaconsScreen() {
  const nameFieldId = useId();
  const searchFieldId = useId();
  const composerSearchFieldId = useId();
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
  const [listTargetCreatePending, setListTargetCreatePending] = useState(false);
  const [listTargetRemovePending, setListTargetRemovePending] = useState(false);
  const [listTargetPlaceOnCanvasPending, setListTargetPlaceOnCanvasPending] = useState(false);
  const [listTargetPhase, setListTargetPhase] = useState<"loading" | "absent" | "synced" | "updating">("loading");
  const [listTargetRegisteredName, setListTargetRegisteredName] = useState<string | null>(null);
  const [listTargetOnCanvasCount, setListTargetOnCanvasCount] = useState(0);
  const [removeListTargetDialogOpen, setRemoveListTargetDialogOpen] = useState(false);
  const [activeBeaconKey, setActiveBeaconKey] = useState<string | null>(null);
  const listTargetResolveGen = useRef(0);
  const [openingBeaconKey, setOpeningBeaconKey] = useState<string | null>(null);
  const [beaconToDelete, setBeaconToDelete] = useState<BeaconOnPage | null>(null);
  const [deletePendingKey, setDeletePendingKey] = useState<string | null>(null);
  const [embedSyncPending, setEmbedSyncPending] = useState(false);
  const [pageRuntimeStatusLoading, setPageRuntimeStatusLoading] = useState(true);
  const [pageRuntimeSynced, setPageRuntimeSynced] = useState(false);
  const [pageRuntimeSyncReason, setPageRuntimeSyncReason] = useState<string | undefined>(undefined);
  /** Hash can match while Engine still changed beacon contents; user must Sync to acknowledge. */
  const [engineListCompositionStale, setEngineListCompositionStale] = useState(false);

  const [beaconMainTab, setBeaconMainTab] = useState<"engine" | "composer">("engine");
  const [composerEligibleLoading, setComposerEligibleLoading] = useState(false);
  const [composerEligible, setComposerEligible] = useState<BeaconOnPage[]>([]);
  const [composerRuntimeOk, setComposerRuntimeOk] = useState(false);
  const [composerStudio, setComposerStudio] = useState<{ beacon: BeaconOnPage; initialSignature: string } | null>(null);
  const [composerDraft, setComposerDraft] = useState<BeaconCompositionDraftRow[]>([]);
  const [composerOpeningKey, setComposerOpeningKey] = useState<string | null>(null);
  const [composerSavePending, setComposerSavePending] = useState(false);
  const [composerComponentQuery, setComposerComponentQuery] = useState("");
  const [composerCatalog, setComposerCatalog] = useState<ComponentSearchResult[]>([]);
  const [composerCatalogLoading, setComposerCatalogLoading] = useState(false);
  const [composerCatalogError, setComposerCatalogError] = useState<string | null>(null);

  const refreshPageBeacons = useCallback(async () => {
    setPageScanLoading(true);
    setPageRuntimeStatusLoading(true);
    const runtimePromise = getBeaconPageRuntimeSyncStatus()
      .then((runtime) => {
        setPageRuntimeSynced(runtime.synced);
        setPageRuntimeSyncReason(runtime.reason);
      })
      .catch(() => {
        setPageRuntimeSynced(false);
        setPageRuntimeSyncReason("Could not check page script status.");
      })
      .finally(() => {
        setPageRuntimeStatusLoading(false);
      });

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

    await runtimePromise;
  }, []);

  const loadComposerEligible = useCallback(async () => {
    setComposerEligibleLoading(true);
    try {
      const found = await findBeaconTargetsOnPage();
      const r = await listComposerEligibleLists(found);
      setComposerEligible(r.eligible);
      setComposerRuntimeOk(r.runtimeOk);
      setPageRuntimeSynced(r.pageRuntimeSynced);
      setPageRuntimeSyncReason(r.runtimeOk ? undefined : r.runtimeReason);
    } catch {
      setComposerEligible([]);
      setComposerRuntimeOk(false);
      try {
        const runtime = await getBeaconPageRuntimeSyncStatus();
        setPageRuntimeSynced(runtime.synced);
        setPageRuntimeSyncReason(runtime.reason);
      } catch {
        setPageRuntimeSynced(false);
        setPageRuntimeSyncReason("Could not check page script status.");
      }
    } finally {
      setComposerEligibleLoading(false);
    }
  }, []);

  const syncShellOk = useMemo(
    () => pageRuntimeSynced && !engineListCompositionStale,
    [pageRuntimeSynced, engineListCompositionStale]
  );

  const syncShellReason = useMemo(
    () =>
      !pageRuntimeSynced
        ? pageRuntimeSyncReason
        : engineListCompositionStale
          ? "Beacon list changed in Engine — sync page script."
          : undefined,
    [pageRuntimeSynced, pageRuntimeSyncReason, engineListCompositionStale]
  );

  const runComposerCatalogLoad = useCallback(async (q: string) => {
    setComposerCatalogLoading(true);
    setComposerCatalogError(null);
    try {
      const list = await listSiteComponentsForPicker(q);
      setComposerCatalog(list);
    } catch (err) {
      setComposerCatalogError(formatDesignerError(err));
      setComposerCatalog([]);
    } finally {
      setComposerCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPageBeacons();
  }, [refreshPageBeacons]);

  useEffect(() => {
    if (beaconMainTab !== "composer") return;
    void loadComposerEligible();
  }, [beaconMainTab, loadComposerEligible]);

  useEffect(() => {
    if (typeof webflow.getCurrentMode !== "function" || typeof webflow.subscribe !== "function") {
      return undefined;
    }
    const applyMode = () => {
      void (async () => {
        try {
          if ((await webflow.getCurrentMode()) === "preview") {
            await clearAllBeaconListTargetDesignerPreviewsOnPage();
          } else {
            await resyncAllBeaconListTargetDesignerPreviewsOnPage();
          }
        } catch {
          /* designer preview is best-effort */
        }
      })();
    };
    applyMode();
    const unsubMode = webflow.subscribe("currentappmode", () => {
      applyMode();
    });
    return () => {
      unsubMode();
    };
  }, []);

  useEffect(() => {
    if (typeof webflow.subscribe !== "function") return undefined;
    return webflow.subscribe("currentpage", () => {
      setPicking(false);
      setCreateFormOpen(false);
      setActiveDataList(null);
      setSelected([]);
      targetRef.current = null;
      setBeaconMainTab("engine");
      setComposerStudio(null);
      setComposerDraft([]);
      setComposerComponentQuery("");
      setComposerCatalog([]);
      setComposerCatalogError(null);
      setComposerOpeningKey(null);
      setBeaconName("");
      setListTargetCreatePending(false);
      setListTargetRemovePending(false);
      setListTargetPlaceOnCanvasPending(false);
      setListTargetPhase("loading");
      setListTargetRegisteredName(null);
      setListTargetOnCanvasCount(0);
      setRemoveListTargetDialogOpen(false);
      setActiveBeaconKey(null);
      listTargetResolveGen.current += 1;
      setEngineListCompositionStale(false);
      void refreshPageBeacons();
      if (typeof webflow.getCurrentMode === "function") {
        void (async () => {
          try {
            if ((await webflow.getCurrentMode()) === "preview") {
              await clearAllBeaconListTargetDesignerPreviewsOnPage();
            } else {
              await resyncAllBeaconListTargetDesignerPreviewsOnPage();
            }
          } catch {
            /* best-effort */
          }
        })();
      }
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

  useEffect(() => {
    if (composerStudio == null) return;
    const delayMs = composerComponentQuery.trim() ? 280 : 0;
    const t = window.setTimeout(() => {
      void runComposerCatalogLoad(composerComponentQuery);
    }, delayMs);
    return () => window.clearTimeout(t);
  }, [composerStudio, composerComponentQuery, runComposerCatalogLoad]);

  useEffect(() => {
    if (!picking || activeDataList == null || activeBeaconKey == null) {
      return;
    }
    const listContainer = targetRef.current;
    if (!listContainer) {
      setListTargetPhase("absent");
      return;
    }

    const myGen = ++listTargetResolveGen.current;
    setListTargetPhase("loading");
    setListTargetRegisteredName(null);

    void runListTargetReconcileOnOpen(
      myGen,
      listTargetResolveGen,
      activeDataList,
      listContainer,
      setListTargetPhase,
      setListTargetRegisteredName
    );
  }, [picking, activeDataList, activeBeaconKey]);

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
    setListTargetCreatePending(false);
    setListTargetRemovePending(false);
    setListTargetPlaceOnCanvasPending(false);
    setListTargetPhase("loading");
    setListTargetRegisteredName(null);
    setListTargetOnCanvasCount(0);
    setRemoveListTargetDialogOpen(false);
    setActiveBeaconKey(null);
    listTargetResolveGen.current += 1;
    void refreshPageBeacons();
  }, [refreshPageBeacons]);

  useEffect(() => {
    if (!picking || listTargetPhase !== "synced" || activeDataList == null || activeBeaconKey == null) {
      setListTargetOnCanvasCount(0);
      return;
    }
    const listContainer = targetRef.current;
    if (listContainer == null) {
      setListTargetOnCanvasCount(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const list = await listBeaconListTargetInstancesOnPage(activeDataList, listContainer);
        if (!cancelled) {
          setListTargetOnCanvasCount(list.length);
        }
      } catch {
        if (!cancelled) {
          setListTargetOnCanvasCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [picking, listTargetPhase, activeDataList, activeBeaconKey]);

  useEffect(() => {
    if (!picking || listTargetPhase !== "synced" || activeDataList == null) {
      return;
    }
    const listContainer = targetRef.current;
    if (listContainer == null) {
      return;
    }
    const compositionSignature = `${activeDataList}|${selected.map((s) => s.componentId).join(",")}|${listTargetOnCanvasCount}`;
    void compositionSignature;
    void (async () => {
      try {
        await syncBeaconListTargetDesignerPreview(activeDataList, listContainer);
      } catch {
        /* best-effort */
      }
    })();
  }, [picking, listTargetPhase, activeDataList, selected, listTargetOnCanvasCount]);

  const handleOpenBeacon = async (beacon: BeaconOnPage) => {
    setCreateFormOpen(false);
    setOpeningBeaconKey(beacon.key);
    try {
      const rows = await listInstancesInBeaconTarget(beacon.container);
      targetRef.current = beacon.container;
      setActiveDataList(beacon.dataList);
      setActiveBeaconKey(beacon.key);
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
      setActiveBeaconKey(beaconTargetKey(container));
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

  const composerSelectedComponentIdSet = useMemo(
    () => new Set(composerDraft.map((s) => s.componentId)),
    [composerDraft]
  );

  const composerDirty = useMemo(() => {
    if (composerStudio == null) return false;
    return composerDraft.map((d) => d.componentId).join(",") !== composerStudio.initialSignature;
  }, [composerDraft, composerStudio]);

  const handleBeaconTabChange = useCallback(
    (v: string) => {
      const t = v as "engine" | "composer";
      if (t === "composer" && picking) return;
      if (t === "engine" && composerStudio != null) return;
      setBeaconMainTab(t);
    },
    [picking, composerStudio]
  );

  const handleOpenComposerStudio = async (beacon: BeaconOnPage) => {
    setComposerOpeningKey(beacon.key);
    try {
      const rows = await listInstancesInBeaconTarget(beacon.container);
      setComposerDraft(rows.map((r) => ({ key: r.key, componentId: r.componentId, name: r.name })));
      setComposerStudio({ beacon, initialSignature: rows.map((r) => r.componentId).join(",") });
      setComposerComponentQuery("");
      setComposerCatalog([]);
      setComposerCatalogError(null);
    } catch (err) {
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setComposerOpeningKey(null);
    }
  };

  const handleComposerStudioBack = useCallback(() => {
    setComposerStudio(null);
    setComposerDraft([]);
    setComposerComponentQuery("");
    setComposerCatalog([]);
    setComposerCatalogError(null);
  }, []);

  const handleComposerAddComponent = useCallback(
    (c: ComponentSearchResult) => {
      if (composerSelectedComponentIdSet.has(c.id)) return;
      setComposerDraft((prev) => [...prev, { key: crypto.randomUUID(), componentId: c.id, name: c.name }]);
    },
    [composerSelectedComponentIdSet]
  );

  const handleComposerMoveUp = useCallback((key: string) => {
    setComposerDraft((prev) => {
      const idx = prev.findIndex((r) => r.key === key);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const handleComposerMoveDown = useCallback((key: string) => {
    setComposerDraft((prev) => {
      const idx = prev.findIndex((r) => r.key === key);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const handleComposerRemoveDraft = useCallback((key: string) => {
    setComposerDraft((prev) => prev.filter((r) => r.key !== key));
  }, []);

  const handleComposerSave = async () => {
    if (composerSavePending || composerStudio == null) return;
    const { beacon } = composerStudio;
    if (composerDraft.length === 0) {
      void webflow.notify({ type: "Error", message: "Add at least one component before saving." });
      return;
    }
    setComposerSavePending(true);
    try {
      const hydrated = await applyBeaconCompositionDraft(beacon.container, composerDraft);
      await syncBeaconListTargetDesignerPreview(beacon.dataList, beacon.container);
      await syncBeaconPageInlineScript();
      setComposerDraft(hydrated.map((h) => ({ key: h.key, componentId: h.componentId, name: h.name })));
      setComposerStudio((prev) =>
        prev ? { ...prev, initialSignature: hydrated.map((h) => h.componentId).join(",") } : null
      );
      void webflow.notify({
        type: "Success",
        message: "Composition saved. Preview and page script updated — publish for the live site.",
      });
      setEngineListCompositionStale(false);
      void refreshPageBeacons();
      void loadComposerEligible();
    } catch (err) {
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setComposerSavePending(false);
    }
  };

  const handleAddComponent = async (c: ComponentSearchResult) => {
    if (selectedComponentIdSet.has(c.id)) return;
    const container = targetRef.current;
    if (!container || addPending) return;
    setAddPending(true);
    try {
      const instance = await appendComponentToBeacon(container, c.id);
      setSelected((prev) => [...prev, { key: crypto.randomUUID(), componentId: c.id, name: c.name, instance }]);
      setEngineListCompositionStale(true);
      void refreshPageBeacons();
    } catch (err) {
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setAddPending(false);
    }
  };

  const handleSyncInstallEmbed = async () => {
    if (embedSyncPending) return;
    setEmbedSyncPending(true);
    try {
      await syncBeaconsInstallEmbedOnPage();
      setEngineListCompositionStale(false);
      void webflow.notify({
        type: "Success",
        message: "Page custom code updated. Publish the site to apply on the live site.",
      });
      await refreshPageBeacons();
      if (beaconMainTab === "composer") {
        await loadComposerEligible();
      }
    } catch (err) {
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setEmbedSyncPending(false);
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
      setEngineListCompositionStale(false);
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
      setEngineListCompositionStale(true);
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
      setEngineListCompositionStale(true);
      void refreshPageBeacons();
    } catch (err) {
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setRemovingKey(null);
    }
  };

  const handleCreateListTarget = async () => {
    if (listTargetCreatePending || listTargetRemovePending || activeDataList == null) return;
    if (listTargetPhase !== "absent") return;
    const listContainer = targetRef.current;
    if (!listContainer) return;
    listTargetResolveGen.current += 1;
    setListTargetCreatePending(true);
    try {
      const created = await createBeaconListTargetComponent({
        dataList: activeDataList,
        listContainer,
      });
      const registeredName = await created.getName();
      setListTargetRegisteredName(registeredName);
      setListTargetPhase("synced");
      void webflow.notify({
        type: "Success",
        message: `List target “${registeredName}” added under ${BEACON_UTILITIES_COMPONENT_GROUP}.`,
      });
    } catch (err) {
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setListTargetCreatePending(false);
    }
  };

  const handlePlaceListTargetOnCanvas = async () => {
    if (
      listTargetPlaceOnCanvasPending ||
      listTargetCreatePending ||
      listTargetRemovePending ||
      listTargetPhase !== "synced" ||
      activeDataList == null
    ) {
      return;
    }
    const listContainer = targetRef.current;
    if (!listContainer) return;
    setListTargetPlaceOnCanvasPending(true);
    try {
      const { instance, alreadyExisted } = await placeBeaconListTargetOnCanvas(activeDataList, listContainer);
      try {
        await webflow.setSelectedElement(instance);
      } catch {
        /* selection is optional */
      }
      try {
        const list = await listBeaconListTargetInstancesOnPage(activeDataList, listContainer);
        setListTargetOnCanvasCount(list.length);
      } catch {
        setListTargetOnCanvasCount(0);
      }
      void webflow.notify({
        type: "Success",
        message: alreadyExisted ? "Selected the list target on the canvas." : "List target placed on the canvas.",
      });
    } catch (err) {
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setListTargetPlaceOnCanvasPending(false);
    }
  };

  const handleRequestRemoveListTarget = () => {
    if (listTargetPhase !== "synced" || listTargetCreatePending || listTargetRemovePending) return;
    setRemoveListTargetDialogOpen(true);
  };

  const handleConfirmRemoveListTarget = async () => {
    if (listTargetRemovePending || activeDataList == null) return;
    const listContainer = targetRef.current;
    if (!listContainer) return;
    setListTargetRemovePending(true);
    try {
      const comp = await getBeaconListTargetComponentOrNull(activeDataList, listContainer);
      if (comp == null) {
        void webflow.notify({
          type: "Warning",
          message:
            "No matching list target component found. It may have been renamed, moved, or deleted in the Components panel.",
        });
      } else {
        await webflow.unregisterComponent(comp);
        void webflow.notify({ type: "Success", message: "List target removed from the site." });
      }
      listTargetResolveGen.current += 1;
      setListTargetRegisteredName(null);
      setListTargetPhase("absent");
      setRemoveListTargetDialogOpen(false);
    } catch (err) {
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setListTargetRemovePending(false);
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {/* /beacons page title only. Global app bar is `Header` in the shell, not this strip. */}
      <div className="shrink-0 border-b border-border/50 bg-muted/20 dark:bg-muted/15" data-slot="beacons_route_header">
        <div className="mx-auto flex h-8 min-w-0 max-w-lg items-center justify-between gap-2 px-3">
          <h2 className="text-sm font-medium leading-none tracking-tight text-foreground">Beacons</h2>
          <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5">
            {beaconsWrapperInstalled && !pageRuntimeStatusLoading ? (
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
            <BeaconPageRuntimeHeaderStatus
              loading={pageRuntimeStatusLoading}
              synced={syncShellOk}
              reason={syncShellReason}
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-auto px-3 py-3">
        <div className="mx-auto w-full max-w-lg space-y-4">
          <Tabs value={beaconMainTab} onValueChange={handleBeaconTabChange} className="gap-4">
            <TabsList variant="line" className="h-auto w-full min-w-0 flex-wrap justify-start gap-1 bg-transparent p-0">
              <TabsTrigger value="engine" disabled={composerStudio != null} className="flex-none">
                Engine
              </TabsTrigger>
              <TabsTrigger value="composer" disabled={picking} className="flex-none">
                Composer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="engine" className="mt-0 space-y-4 outline-none">
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
                  embedSyncPending={embedSyncPending}
                  onSyncInstallEmbed={handleSyncInstallEmbed}
                  pageRuntimeStatusLoading={pageRuntimeStatusLoading}
                  pageRuntimeSynced={syncShellOk}
                  pageRuntimeSyncReason={syncShellReason}
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
                  listTargetPhase={listTargetPhase}
                  listTargetOnCanvasCount={listTargetOnCanvasCount}
                  onCreateListTarget={handleCreateListTarget}
                  onRequestRemoveListTarget={handleRequestRemoveListTarget}
                  onPlaceListTargetOnCanvas={handlePlaceListTargetOnCanvas}
                  listTargetCreatePending={listTargetCreatePending}
                  listTargetRemovePending={listTargetRemovePending}
                  listTargetPlaceOnCanvasPending={listTargetPlaceOnCanvasPending}
                  embedSyncPending={embedSyncPending}
                  onSyncInstallEmbed={handleSyncInstallEmbed}
                  pageRuntimeStatusLoading={pageRuntimeStatusLoading}
                  pageRuntimeSynced={syncShellOk}
                  pageRuntimeSyncReason={syncShellReason}
                />
              )}
            </TabsContent>

            <TabsContent value="composer" className="mt-0 space-y-4 outline-none">
              {composerStudio == null ? (
                <BeaconComposerListPanel
                  pageScanLoading={pageScanLoading}
                  beaconsWrapperInstalled={beaconsWrapperInstalled}
                  loading={composerEligibleLoading}
                  runtimeOk={composerRuntimeOk && syncShellOk}
                  engineCompositionStale={composerRuntimeOk && engineListCompositionStale}
                  eligible={composerEligible}
                  openingKey={composerOpeningKey}
                  onOpenList={(b) => void handleOpenComposerStudio(b)}
                  onRefresh={() => void loadComposerEligible()}
                />
              ) : (
                <BeaconComposerStudioPanel
                  searchFieldId={composerSearchFieldId}
                  activeDataList={composerStudio.beacon.dataList}
                  draft={composerDraft}
                  dirty={composerDirty}
                  componentQuery={composerComponentQuery}
                  setComponentQuery={setComposerComponentQuery}
                  catalogLoading={composerCatalogLoading}
                  catalogError={composerCatalogError}
                  componentCatalog={composerCatalog}
                  selectedComponentIdSet={composerSelectedComponentIdSet}
                  addPending={composerSavePending}
                  onAddComponent={handleComposerAddComponent}
                  onMoveUp={handleComposerMoveUp}
                  onMoveDown={handleComposerMoveDown}
                  onRemove={handleComposerRemoveDraft}
                  onBack={handleComposerStudioBack}
                  onSave={() => void handleComposerSave()}
                  savePending={composerSavePending}
                  pageRuntimeStatusLoading={pageRuntimeStatusLoading}
                  pageRuntimeSynced={syncShellOk}
                  pageRuntimeSyncReason={syncShellReason}
                  embedSyncPending={embedSyncPending}
                  onSyncInstallEmbed={handleSyncInstallEmbed}
                />
              )}
            </TabsContent>
          </Tabs>

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

          <AlertDialog
            open={removeListTargetDialogOpen}
            onOpenChange={(o) => {
              if (!o && !listTargetRemovePending) {
                setRemoveListTargetDialogOpen(false);
              }
            }}
          >
            <AlertDialogContent size="default">
              <AlertDialogHeader>
                <AlertDialogTitle>Remove list target?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the site component
                  {listTargetRegisteredName != null && (
                    <>
                      {" "}
                      <code className="font-mono text-[0.85em] text-foreground">{listTargetRegisteredName}</code>
                    </>
                  )}{" "}
                  from <span className="text-foreground">{BEACON_UTILITIES_COMPONENT_GROUP}</span>. Any instances on the
                  canvas become plain elements. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={listTargetRemovePending}
                  onClick={() => setRemoveListTargetDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={listTargetRemovePending}
                  onClick={() => void handleConfirmRemoveListTarget()}
                >
                  {listTargetRemovePending ? "Removing…" : "Remove target"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
