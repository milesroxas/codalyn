import { type MutableRefObject, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { listComposerEligibleLists } from "@/features/beacons/model/beacon-composer-eligible";
import {
  ensureBeaconListCmsTextFieldOnList,
  getBeaconListTargetCmsFieldIdFromListContainer,
  resolveBeaconListTargetCmsCollectionIdForCleanup,
  tryDeleteBeaconListTargetCmsPlainTextField,
} from "@/features/beacons/model/beacon-list-target-cms-text-binding";
import {
  clearAllBeaconListTargetDesignerPreviewsOnPage,
  syncBeaconListTargetDesignerPreview,
} from "@/features/beacons/model/beacon-list-target-designer-preview";
import {
  listBeaconListTargetInstancesOnPage,
  removeAllBeaconListTargetInstancesOnPage,
} from "@/features/beacons/model/beacon-list-target-instances-on-page";
import {
  getBeaconPageRuntimeSyncStatus,
  syncBeaconPageInlineScript,
} from "@/features/beacons/model/beacon-page-inline-script";
import {
  type BeaconOnPage,
  beaconTargetKey,
  filterHydratedBeaconComponentsByComponentIds,
  findBeaconTargetsOnPage,
  type HydratedBeaconComponent,
  listInstancesInBeaconTarget,
  resolveBeaconEngineConfiguredComponentIds,
  writeBeaconEngineConfiguredComponentIds,
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
  removeBeaconsWrapperIfNoBeaconTargetsOnPage,
  syncBeaconsInstallEmbedOnPage,
  uninstallBeaconsPageInstall,
} from "@/features/beacons/model/install-beacons-wrapper";
import { placeBeaconListTargetOnCanvas } from "@/features/beacons/model/place-beacon-list-target-on-canvas";
import {
  appendComponentToBeacon,
  applyBeaconCompositionDraft,
  type BeaconCompositionDraftRow,
  type BeaconPaletteEntry,
  deleteBeaconAndListTargetDefinition,
  listSiteComponentsForPicker,
  removeComponentInstanceFromCanvas,
} from "@/features/beacons/model/site-components";
import { BeaconComposerListPanel } from "@/features/beacons/ui/beacon-composer-list-panel";
import { BeaconComposerStudioPanel } from "@/features/beacons/ui/beacon-composer-studio-panel";
import { BeaconCompositionPanel } from "@/features/beacons/ui/beacon-composition-panel";
import { BeaconHomePanel } from "@/features/beacons/ui/beacon-home-panel";
import { BeaconPageRuntimeHeaderStatus } from "@/features/beacons/ui/beacon-page-runtime-header-status";
import { cn } from "@/shared/lib/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { ScrollArea } from "@/shared/ui/scroll-area";

function formatDesignerError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Check that you can edit the current page.";
}

type ListTargetReconcileCacheEntry = {
  beaconKey: string;
  dataList: string;
  phase: "synced" | "absent";
  registeredName: string | null;
};

async function runListTargetReconcileOnOpen(
  myGen: number,
  listTargetResolveGen: MutableRefObject<number>,
  activeDataList: string,
  listContainer: BlockElement,
  listTargetDefinitionIdRef: MutableRefObject<string | null>,
  setListTargetPhase: (p: "loading" | "absent" | "synced" | "updating") => void,
  setListTargetRegisteredName: (n: string | null) => void,
  onSettled?: (result: { phase: "synced" | "absent"; registeredName: string | null }) => void,
  onAbsent?: () => void
) {
  const stale = () => listTargetResolveGen.current !== myGen;
  setListTargetPhase("updating");
  try {
    const comp = await getBeaconListTargetComponentOrNull(
      activeDataList,
      listContainer,
      listTargetDefinitionIdRef.current
    );
    if (stale()) return;
    if (comp == null) {
      setListTargetRegisteredName(null);
      setListTargetPhase("absent");
      if (!stale()) {
        onSettled?.({ phase: "absent", registeredName: null });
      }
      return;
    }
    const name = await comp.getName();
    if (stale()) return;
    setListTargetRegisteredName(name);
    setListTargetPhase("synced");
    if (!stale()) {
      onSettled?.({ phase: "synced", registeredName: name });
    }
  } catch (e) {
    if (stale()) return;
    onAbsent?.();
    setListTargetPhase("absent");
    void webflow.notify({ type: "Error", message: formatDesignerError(e) });
  }
}

async function beaconPaletteFromConfiguredComponentIds(
  componentIds: readonly string[],
  rows: HydratedBeaconComponent[]
): Promise<BeaconPaletteEntry[]> {
  const paletteById = new Map<string, BeaconPaletteEntry>();
  for (const row of rows) {
    if (!paletteById.has(row.componentId)) {
      paletteById.set(row.componentId, { id: row.componentId, name: row.name, group: null });
    }
  }

  const out: BeaconPaletteEntry[] = [];
  for (const componentId of componentIds) {
    const fromRows = paletteById.get(componentId);
    if (fromRows != null) {
      out.push(fromRows);
      continue;
    }
    try {
      const comp = await webflow.getComponent(componentId);
      const name = await comp.getName();
      const group = (await comp.getSettings()).group;
      out.push({ id: componentId, name, group });
    } catch {
      /* component can be deleted; skip stale ids */
    }
  }
  return out;
}

/**
 * `BeaconsScreen` is wrapped by a parent route element; `useParams` is often empty. Prefer `pathname` from
 * `useLocation`, then the hash (HashRouter) if needed.
 */
function parseBeaconsRouteSegment(pathname: string, locationHash: string): "engine" | "composer" | null {
  for (const raw of [pathname, locationHash.replace(/^#/, "")].filter(Boolean)) {
    const p = raw.startsWith("/") ? raw : `/${raw}`;
    const m = /^\/beacons\/(engine|composer)\/?$/.exec(p);
    if (m != null) {
      return m[1] as "engine" | "composer";
    }
  }
  return null;
}

function useBeaconsInvalidSegmentRedirect(
  segmentFromPath: "engine" | "composer" | null,
  routePathname: string,
  routeHash: string,
  navigate: (to: string, options?: { replace?: boolean }) => void
) {
  useEffect(() => {
    if (segmentFromPath != null) return;
    for (const raw of [routePathname, routeHash.replace(/^#/, "")].filter(Boolean)) {
      const p = raw.startsWith("/") ? raw : `/${raw}`;
      const m = /^\/beacons\/([^/]+)\/?$/.exec(p);
      if (m != null && m[1] !== "engine" && m[1] !== "composer") {
        void navigate("/beacons/engine", { replace: true });
        return;
      }
    }
  }, [segmentFromPath, routePathname, routeHash, navigate]);
}

function useBeaconsListTargetPreviewOnModeChange() {
  const lastDesignerAppModeRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof webflow.getCurrentMode !== "function" || typeof webflow.subscribe !== "function") {
      return undefined;
    }

    const syncPreviewsForCurrentMode = async () => {
      try {
        const mode = await webflow.getCurrentMode();
        const key = String(mode);
        if (lastDesignerAppModeRef.current === key) {
          return;
        }
        lastDesignerAppModeRef.current = key;
        if (mode === "preview") {
          await clearAllBeaconListTargetDesignerPreviewsOnPage();
        }
      } catch {
        /* designer preview is best-effort */
      }
    };

    void syncPreviewsForCurrentMode();
    const unsubMode = webflow.subscribe("currentappmode", () => {
      void syncPreviewsForCurrentMode();
    });
    return () => {
      lastDesignerAppModeRef.current = null;
      unsubMode();
    };
  }, []);
}

type BeaconsPageChangeReset = {
  setPicking: (v: boolean) => void;
  setCreateFormOpen: (v: boolean) => void;
  setActiveDataList: (v: string | null) => void;
  setSelected: (v: HydratedBeaconComponent[]) => void;
  setComposerStudio: (v: { beacon: BeaconOnPage; initialSignature: string } | null) => void;
  setComposerDraft: (v: BeaconCompositionDraftRow[]) => void;
  setComposerAllowedPalette: (v: BeaconPaletteEntry[]) => void;
  setComposerOpeningKey: (v: string | null) => void;
  setBeaconName: (v: string) => void;
  setListTargetCreatePending: (v: boolean) => void;
  setListTargetRemovePending: (v: boolean) => void;
  setListTargetPlaceOnCanvasPending: (v: boolean) => void;
  setListTargetPhase: (v: "loading" | "absent" | "synced" | "updating") => void;
  setListTargetRegisteredName: (v: string | null) => void;
  setListTargetOnCanvasCount: (v: number) => void;
  setListTargetPreviewSyncPending: (v: boolean) => void;
  setRemoveListTargetDialogOpen: (v: boolean) => void;
  setActiveBeaconKey: (v: string | null) => void;
  setEngineListCompositionStale: (v: boolean) => void;
  targetRef: MutableRefObject<BlockElement | null>;
  listTargetResolveGen: MutableRefObject<number>;
  listTargetReconcileCacheRef: MutableRefObject<ListTargetReconcileCacheEntry | null>;
  listTargetDefinitionIdRef: MutableRefObject<string | null>;
};

function useBeaconsPageChangeReset(
  refreshPageBeacons: () => void | Promise<void>,
  navigate: (to: string, options?: { replace?: boolean }) => void,
  resetRef: MutableRefObject<BeaconsPageChangeReset | null>
) {
  const lastDesignerPageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof webflow.subscribe !== "function" || typeof webflow.getCurrentPage !== "function") {
      return undefined;
    }

    let cancelled = false;
    let unsubPage: (() => void) | undefined;

    void (async () => {
      try {
        const initial = await webflow.getCurrentPage();
        if (cancelled) return;
        lastDesignerPageIdRef.current = String(initial.id);
      } catch {
        if (cancelled) return;
        lastDesignerPageIdRef.current = null;
      }

      if (cancelled) return;

      unsubPage = webflow.subscribe("currentpage", (page) => {
        const reset = resetRef.current;
        if (reset == null) {
          return;
        }
        const id = String(page.id);
        if (lastDesignerPageIdRef.current === id) {
          return;
        }
        lastDesignerPageIdRef.current = id;

        reset.setPicking(false);
        reset.setCreateFormOpen(false);
        reset.setActiveDataList(null);
        reset.setSelected([]);
        reset.targetRef.current = null;
        void navigate("/beacons/engine", { replace: true });
        reset.setComposerStudio(null);
        reset.setComposerDraft([]);
        reset.setComposerAllowedPalette([]);
        reset.setComposerOpeningKey(null);
        reset.setBeaconName("");
        reset.setListTargetCreatePending(false);
        reset.setListTargetRemovePending(false);
        reset.setListTargetPlaceOnCanvasPending(false);
        reset.setListTargetPhase("loading");
        reset.setListTargetRegisteredName(null);
        reset.setListTargetOnCanvasCount(0);
        reset.setListTargetPreviewSyncPending(false);
        reset.setRemoveListTargetDialogOpen(false);
        reset.setActiveBeaconKey(null);
        reset.listTargetResolveGen.current += 1;
        reset.listTargetReconcileCacheRef.current = null;
        reset.listTargetDefinitionIdRef.current = null;
        reset.setEngineListCompositionStale(false);
        void refreshPageBeacons();
        if (typeof webflow.getCurrentMode === "function") {
          void (async () => {
            try {
              if ((await webflow.getCurrentMode()) === "preview") {
                await clearAllBeaconListTargetDesignerPreviewsOnPage();
              }
            } catch {
              /* best-effort */
            }
          })();
        }
      });
    })();

    return () => {
      cancelled = true;
      unsubPage?.();
    };
  }, [refreshPageBeacons, navigate, resetRef]);
}

function useBeaconSyncShellLabels(
  pageRuntimeSynced: boolean,
  pageRuntimeSyncReason: string | undefined,
  engineListCompositionStale: boolean
) {
  return useMemo(() => {
    if (!pageRuntimeSynced) {
      return { syncShellOk: false as const, syncShellReason: pageRuntimeSyncReason };
    }
    if (engineListCompositionStale) {
      return {
        syncShellOk: false as const,
        syncShellReason: "Beacon list changed in Engine — sync page script." as const,
      };
    }
    return { syncShellOk: true as const, syncShellReason: undefined };
  }, [pageRuntimeSynced, pageRuntimeSyncReason, engineListCompositionStale]);
}

function useDebounceComponentCatalog(picking: boolean, componentQuery: string, runCatalogLoad: (q: string) => void) {
  useEffect(() => {
    if (!picking) return;
    const delayMs = componentQuery.trim() ? 280 : 0;
    const t = window.setTimeout(() => {
      void runCatalogLoad(componentQuery);
    }, delayMs);
    return () => window.clearTimeout(t);
  }, [picking, componentQuery, runCatalogLoad]);
}

function useListTargetReconcileWhenPicking(
  picking: boolean,
  activeDataList: string | null,
  activeBeaconKey: string | null,
  setListTargetPhase: (p: "loading" | "absent" | "synced" | "updating") => void,
  setListTargetRegisteredName: (n: string | null) => void,
  targetRef: MutableRefObject<BlockElement | null>,
  listTargetReconcileCacheRef: MutableRefObject<ListTargetReconcileCacheEntry | null>,
  listTargetResolveGen: MutableRefObject<number>,
  listTargetDefinitionIdRef: MutableRefObject<string | null>
) {
  useEffect(() => {
    if (!picking || activeDataList == null || activeBeaconKey == null) {
      return;
    }
    const listContainer = targetRef.current;
    if (!listContainer) {
      setListTargetPhase("absent");
      return;
    }

    const cache = listTargetReconcileCacheRef.current;
    if (cache != null && cache.beaconKey === activeBeaconKey && cache.dataList === activeDataList) {
      setListTargetPhase(cache.phase);
      setListTargetRegisteredName(cache.registeredName);
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
      listTargetDefinitionIdRef,
      setListTargetPhase,
      setListTargetRegisteredName,
      (result) => {
        listTargetReconcileCacheRef.current = {
          beaconKey: activeBeaconKey,
          dataList: activeDataList,
          phase: result.phase,
          registeredName: result.registeredName,
        };
        if (result.phase === "absent") {
          listTargetDefinitionIdRef.current = null;
        }
      },
      () => {
        listTargetDefinitionIdRef.current = null;
      }
    );
  }, [
    picking,
    activeDataList,
    activeBeaconKey,
    setListTargetPhase,
    setListTargetRegisteredName,
    targetRef,
    listTargetReconcileCacheRef,
    listTargetResolveGen,
    listTargetDefinitionIdRef,
  ]);
}

function useListTargetOnCanvasCountWhenSynced(
  picking: boolean,
  listTargetPhase: "loading" | "absent" | "synced" | "updating",
  activeDataList: string | null,
  activeBeaconKey: string | null,
  targetRef: MutableRefObject<BlockElement | null>,
  listTargetDefinitionIdRef: MutableRefObject<string | null>,
  setListTargetOnCanvasCount: (n: number) => void
) {
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
        const list = await listBeaconListTargetInstancesOnPage(activeDataList, listContainer, {
          preferredDefinitionId: listTargetDefinitionIdRef.current,
        });
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
  }, [
    picking,
    listTargetPhase,
    activeDataList,
    activeBeaconKey,
    targetRef,
    listTargetDefinitionIdRef,
    setListTargetOnCanvasCount,
  ]);
}

export function BeaconsScreen() {
  const nameFieldId = useId();
  const searchFieldId = useId();
  const lastBeaconUninstallChoiceId = useId();
  const { segment: segmentParam } = useParams();
  const { pathname: routePathname, hash: routeHash } = useLocation();
  const segmentFromPath = parseBeaconsRouteSegment(routePathname, routeHash);
  /** Matched route param is authoritative; fall back to parsed path for older/wrapper edge cases. */
  const segment: "engine" | "composer" =
    segmentParam === "engine" || segmentParam === "composer" ? segmentParam : (segmentFromPath ?? "engine");
  const navigate = useNavigate();
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
  /** Definition id from the last successful “Create list target” — avoids lookup race before Webflow indexes the new component. */
  const listTargetDefinitionIdRef = useRef<string | null>(null);
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
  const [listTargetPreviewSyncPending, setListTargetPreviewSyncPending] = useState(false);
  const [removeListTargetDialogOpen, setRemoveListTargetDialogOpen] = useState(false);
  const [activeBeaconKey, setActiveBeaconKey] = useState<string | null>(null);
  const listTargetResolveGen = useRef(0);
  /** Last known list target registration for a beacon; avoids re-querying Webflow on repeat opens. */
  const listTargetReconcileCacheRef = useRef<ListTargetReconcileCacheEntry | null>(null);
  const [openingBeaconKey, setOpeningBeaconKey] = useState<string | null>(null);
  const [beaconToDelete, setBeaconToDelete] = useState<BeaconOnPage | null>(null);
  const [uninstallWithLastBeaconDelete, setUninstallWithLastBeaconDelete] = useState(false);
  const [deletePendingKey, setDeletePendingKey] = useState<string | null>(null);
  const [embedSyncPending, setEmbedSyncPending] = useState(false);
  const [pageRuntimeStatusLoading, setPageRuntimeStatusLoading] = useState(true);
  const [pageRuntimeSynced, setPageRuntimeSynced] = useState(false);
  const [pageRuntimeSyncReason, setPageRuntimeSyncReason] = useState<string | undefined>(undefined);
  /** Hash can match while Engine still changed beacon contents; user must Sync to acknowledge. */
  const [engineListCompositionStale, setEngineListCompositionStale] = useState(false);

  const isEngine = segment === "engine";
  const isComposer = segment === "composer";
  const [composerEligibleLoading, setComposerEligibleLoading] = useState(false);
  const [composerEligible, setComposerEligible] = useState<BeaconOnPage[]>([]);
  const [composerRuntimeOk, setComposerRuntimeOk] = useState(false);
  const [composerStudio, setComposerStudio] = useState<{ beacon: BeaconOnPage; initialSignature: string } | null>(null);
  const [composerDraft, setComposerDraft] = useState<BeaconCompositionDraftRow[]>([]);
  const [composerAllowedPalette, setComposerAllowedPalette] = useState<BeaconPaletteEntry[]>([]);
  const [composerOpeningKey, setComposerOpeningKey] = useState<string | null>(null);
  const [composerSavePending, setComposerSavePending] = useState(false);

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

  const { syncShellOk, syncShellReason } = useBeaconSyncShellLabels(
    pageRuntimeSynced,
    pageRuntimeSyncReason,
    engineListCompositionStale
  );

  /** Page script sync only matters once the wrapper is installed and at least one beacon list exists. */
  const showPageRuntimeSyncHeader = beaconsWrapperInstalled && pageBeacons.length > 0;

  useEffect(() => {
    void beaconToDelete;
    setUninstallWithLastBeaconDelete(false);
  }, [beaconToDelete]);

  const isLastBeaconOnPageForDelete = useMemo(() => {
    if (beaconToDelete == null) return false;
    return pageBeacons.length === 1 && pageBeacons[0]?.key === beaconToDelete.key;
  }, [beaconToDelete, pageBeacons]);

  useEffect(() => {
    void refreshPageBeacons();
  }, [refreshPageBeacons]);

  useBeaconsInvalidSegmentRedirect(segmentFromPath, routePathname, routeHash, navigate);

  useEffect(() => {
    if (!isComposer) return;
    void loadComposerEligible();
  }, [isComposer, loadComposerEligible]);

  useBeaconsListTargetPreviewOnModeChange();

  const beaconsPageChangeResetRef = useRef<BeaconsPageChangeReset | null>(null);
  beaconsPageChangeResetRef.current = {
    setPicking,
    setCreateFormOpen,
    setActiveDataList,
    setSelected,
    setComposerStudio,
    setComposerDraft,
    setComposerAllowedPalette,
    setComposerOpeningKey,
    setBeaconName,
    setListTargetCreatePending,
    setListTargetRemovePending,
    setListTargetPlaceOnCanvasPending,
    setListTargetPhase,
    setListTargetRegisteredName,
    setListTargetOnCanvasCount,
    setListTargetPreviewSyncPending,
    setRemoveListTargetDialogOpen,
    setActiveBeaconKey,
    setEngineListCompositionStale,
    targetRef,
    listTargetResolveGen,
    listTargetReconcileCacheRef,
    listTargetDefinitionIdRef,
  };
  useBeaconsPageChangeReset(refreshPageBeacons, navigate, beaconsPageChangeResetRef);

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

  useDebounceComponentCatalog(picking, componentQuery, runCatalogLoad);

  useListTargetReconcileWhenPicking(
    picking,
    activeDataList,
    activeBeaconKey,
    setListTargetPhase,
    setListTargetRegisteredName,
    targetRef,
    listTargetReconcileCacheRef,
    listTargetResolveGen,
    listTargetDefinitionIdRef
  );

  const exitToList = useCallback(() => {
    setPicking(false);
    setActiveDataList(null);
    targetRef.current = null;
    listTargetDefinitionIdRef.current = null;
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
    setListTargetPreviewSyncPending(false);
    setRemoveListTargetDialogOpen(false);
    setActiveBeaconKey(null);
    listTargetResolveGen.current += 1;
    void refreshPageBeacons();
  }, [refreshPageBeacons]);

  useListTargetOnCanvasCountWhenSynced(
    picking,
    listTargetPhase,
    activeDataList,
    activeBeaconKey,
    targetRef,
    listTargetDefinitionIdRef,
    setListTargetOnCanvasCount
  );

  const handleOpenBeacon = async (beacon: BeaconOnPage) => {
    setCreateFormOpen(false);
    setOpeningBeaconKey(beacon.key);
    try {
      const rows = await listInstancesInBeaconTarget(beacon.container);
      listTargetDefinitionIdRef.current = null;
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
      listTargetDefinitionIdRef.current = null;
      const { container, dataList } = await createBeaconTargetOnPage(trimmed);
      await ensureBeaconListCmsTextFieldOnList(container, dataList);
      await writeBeaconEngineConfiguredComponentIds(container, []);
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

  const composerDirty = useMemo(() => {
    if (composerStudio == null) return false;
    return composerDraft.map((d) => d.componentId).join(",") !== composerStudio.initialSignature;
  }, [composerDraft, composerStudio]);

  const handleOpenComposerStudio = async (beacon: BeaconOnPage) => {
    setComposerOpeningKey(beacon.key);
    try {
      const rows = await listInstancesInBeaconTarget(beacon.container);
      const configuredComponentIds = await resolveBeaconEngineConfiguredComponentIds(beacon.container, rows);
      const engineScopedRows = filterHydratedBeaconComponentsByComponentIds(rows, configuredComponentIds);
      const allowedPalette = await beaconPaletteFromConfiguredComponentIds(configuredComponentIds, rows);
      setComposerDraft(engineScopedRows.map((r) => ({ key: r.key, componentId: r.componentId, name: r.name })));
      setComposerAllowedPalette(allowedPalette);
      setComposerStudio({ beacon, initialSignature: engineScopedRows.map((r) => r.componentId).join(",") });
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
    setComposerAllowedPalette([]);
  }, []);

  const handleComposerAddFromPalette = useCallback((c: BeaconPaletteEntry) => {
    setComposerDraft((prev) => [...prev, { key: crypto.randomUUID(), componentId: c.id, name: c.name }]);
  }, []);

  const handleComposerReorderDraft = useCallback((fromIndex: number, toIndex: number) => {
    setComposerDraft((prev) => {
      if (fromIndex === toIndex) return prev;
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
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
    const allowedComponentIdSet = new Set(composerAllowedPalette.map((entry) => entry.id));
    const draftToApply = composerDraft.filter((row) => allowedComponentIdSet.has(row.componentId));
    if (draftToApply.length === 0) {
      void webflow.notify({
        type: "Error",
        message: "This list only allows component types configured in Engine.",
      });
      return;
    }
    setComposerSavePending(true);
    try {
      const hydrated = await applyBeaconCompositionDraft(beacon.container, draftToApply);
      await syncBeaconPageInlineScript();
      const hydratedScoped = hydrated.filter((row) => allowedComponentIdSet.has(row.componentId));
      setComposerDraft(hydratedScoped.map((h) => ({ key: h.key, componentId: h.componentId, name: h.name })));
      setComposerStudio((prev) =>
        prev ? { ...prev, initialSignature: hydratedScoped.map((h) => h.componentId).join(",") } : null
      );
      void webflow.notify({
        type: "Success",
        message: "Composition saved. Page script updated — publish for the live site.",
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
      const nextSelected = [...selected, { key: crypto.randomUUID(), componentId: c.id, name: c.name, instance }];
      setSelected(nextSelected);
      await writeBeaconEngineConfiguredComponentIds(
        container,
        nextSelected.map((row) => row.componentId)
      );
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
      if (isComposer) {
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
    const shouldUninstallPage = uninstallWithLastBeaconDelete;
    setDeletePendingKey(target.key);
    try {
      const cmsCollectionIdForCleanup = await resolveBeaconListTargetCmsCollectionIdForCleanup(target.container);
      const cmsFieldIdForCleanup = await getBeaconListTargetCmsFieldIdFromListContainer(target.container);
      await deleteBeaconAndListTargetDefinition(target.dataList, target.container);
      if (cmsCollectionIdForCleanup != null) {
        await tryDeleteBeaconListTargetCmsPlainTextField(
          cmsCollectionIdForCleanup,
          target.dataList,
          cmsFieldIdForCleanup
        );
      }
      if (shouldUninstallPage) {
        await uninstallBeaconsPageInstall();
      }
      await removeBeaconsWrapperIfNoBeaconTargetsOnPage();
      setBeaconToDelete(null);
      setUninstallWithLastBeaconDelete(false);
      void webflow.notify({
        type: "Success",
        message: shouldUninstallPage ? "Beacon removed. Beacons page install cleared." : "Beacon removed.",
      });
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
    const container = targetRef.current;
    if (!container) return;
    setRemovingKey(row.key);
    try {
      await removeComponentInstanceFromCanvas(row.instance);
      const nextSelected = selected.filter((p) => p.key !== row.key);
      setSelected(nextSelected);
      await writeBeaconEngineConfiguredComponentIds(
        container,
        nextSelected.map((entry) => entry.componentId)
      );
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
    if (listTargetCreatePending || listTargetRemovePending || activeDataList == null) {
      return;
    }
    if (listTargetPhase !== "absent") return;
    const listContainer = targetRef.current;
    if (!listContainer) return;
    listTargetResolveGen.current += 1;
    setListTargetCreatePending(true);
    try {
      const { component: created, definitionId } = await createBeaconListTargetComponent({
        dataList: activeDataList,
        listContainer,
      });
      listTargetDefinitionIdRef.current = definitionId;
      const registeredName = await created.getName();
      setListTargetRegisteredName(registeredName);
      setListTargetPhase("synced");
      if (activeBeaconKey != null) {
        listTargetReconcileCacheRef.current = {
          beaconKey: activeBeaconKey,
          dataList: activeDataList,
          phase: "synced",
          registeredName,
        };
      }
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
      const { instance, alreadyExisted } = await placeBeaconListTargetOnCanvas(
        activeDataList,
        listContainer,
        listTargetDefinitionIdRef.current
      );
      try {
        await webflow.setSelectedElement(instance);
      } catch {
        /* selection is optional */
      }
      try {
        const list = await listBeaconListTargetInstancesOnPage(activeDataList, listContainer, {
          preferredDefinitionId: listTargetDefinitionIdRef.current,
        });
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

  const handleSyncListTargetPreview = async () => {
    if (
      listTargetPreviewSyncPending ||
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
    setListTargetPreviewSyncPending(true);
    try {
      await syncBeaconListTargetDesignerPreview(activeDataList, listContainer);
    } catch (err) {
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setListTargetPreviewSyncPending(false);
    }
  };

  const handleRequestRemoveListTarget = () => {
    if (listTargetPhase !== "synced" || listTargetCreatePending || listTargetRemovePending) {
      return;
    }
    setRemoveListTargetDialogOpen(true);
  };

  const handleConfirmRemoveListTarget = async () => {
    if (listTargetRemovePending || activeDataList == null) return;
    const listContainer = targetRef.current;
    if (!listContainer) return;
    setListTargetRemovePending(true);
    const preferredId = listTargetDefinitionIdRef.current;
    try {
      const comp = await getBeaconListTargetComponentOrNull(activeDataList, listContainer, preferredId);
      if (comp == null) {
        void webflow.notify({
          type: "Warning",
          message:
            "No matching list target component found. It may have been renamed, moved, or deleted in the Components panel.",
        });
      } else {
        await removeAllBeaconListTargetInstancesOnPage(activeDataList, listContainer, {
          preferredDefinitionId: preferredId,
        });
        await webflow.unregisterComponent(comp);
        void webflow.notify({ type: "Success", message: "List target removed from the site." });
      }
      listTargetDefinitionIdRef.current = null;
      listTargetResolveGen.current += 1;
      setListTargetRegisteredName(null);
      setListTargetPhase("absent");
      if (activeBeaconKey != null) {
        listTargetReconcileCacheRef.current = {
          beaconKey: activeBeaconKey,
          dataList: activeDataList,
          phase: "absent",
          registeredName: null,
        };
      }
      setRemoveListTargetDialogOpen(false);
      void refreshPageBeacons();
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
            {showPageRuntimeSyncHeader ? (
              <BeaconPageRuntimeHeaderStatus
                loading={pageRuntimeStatusLoading}
                synced={syncShellOk}
                reason={syncShellReason}
              />
            ) : null}
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 min-w-0 flex-1">
        <div className="mx-auto w-full max-w-lg space-y-4 px-3 py-3">
          <nav
            className="flex w-full min-w-0 flex-wrap items-end gap-1 border-b border-border/60"
            aria-label="Beacons area"
          >
            <NavLink
              to="/beacons/engine"
              className={({ isActive }) =>
                cn(
                  "relative -mb-px border-b-2 border-transparent px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
                  isActive && "border-primary text-foreground"
                )
              }
              onClick={() => {
                if (composerStudio != null) {
                  handleComposerStudioBack();
                }
              }}
            >
              Engine
            </NavLink>
            <NavLink
              to="/beacons/composer"
              className={({ isActive }) =>
                cn(
                  "relative -mb-px border-b-2 border-transparent px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
                  isActive && "border-primary text-foreground"
                )
              }
              onClick={() => {
                if (picking) {
                  exitToList();
                }
              }}
            >
              Composer
            </NavLink>
          </nav>

          {isEngine ? (
            <div className="space-y-4" data-route="beacons-engine">
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
                  onSyncListTargetPreview={handleSyncListTargetPreview}
                  listTargetCreatePending={listTargetCreatePending}
                  listTargetRemovePending={listTargetRemovePending}
                  listTargetPlaceOnCanvasPending={listTargetPlaceOnCanvasPending}
                  listTargetPreviewSyncPending={listTargetPreviewSyncPending}
                  embedSyncPending={embedSyncPending}
                  onSyncInstallEmbed={handleSyncInstallEmbed}
                  pageRuntimeStatusLoading={pageRuntimeStatusLoading}
                  pageRuntimeSynced={syncShellOk}
                  pageRuntimeSyncReason={syncShellReason}
                />
              )}
            </div>
          ) : isComposer ? (
            <div className="space-y-4" data-route="beacons-composer">
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
                  activeDataList={composerStudio.beacon.dataList}
                  draft={composerDraft}
                  dirty={composerDirty}
                  allowedPalette={composerAllowedPalette}
                  onAddFromPalette={handleComposerAddFromPalette}
                  onReorder={handleComposerReorderDraft}
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
            </div>
          ) : null}

          <AlertDialog open={beaconToDelete != null} onOpenChange={(o) => !o && setBeaconToDelete(null)}>
            <AlertDialogContent size="default">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this beacon?</AlertDialogTitle>
                <AlertDialogDescription>
                  This unregisters the list-target site component in{" "}
                  <span className="text-foreground">{BEACON_UTILITIES_COMPONENT_GROUP}</span> (if it exists), then
                  removes the hidden list block
                  {beaconToDelete != null && (
                    <>
                      {" "}
                      <code className="font-mono text-[0.85em] text-foreground">{beaconToDelete.dataList}</code>
                    </>
                  )}{" "}
                  and any component instances inside it, including their Text and CMS field bindings. This can&apos;t be
                  undone.
                  {isLastBeaconOnPageForDelete ? (
                    <span>
                      {" "}
                      This is the only beacon list on the page; you can optionally remove the page install as well.
                    </span>
                  ) : null}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {isLastBeaconOnPageForDelete ? (
                <div
                  className="flex max-w-sm gap-2.5 rounded-lg border border-border/70 bg-muted/25 p-2.5 sm:max-w-none"
                  data-slot="beacon_delete_uninstall_page"
                >
                  <Checkbox
                    id={lastBeaconUninstallChoiceId}
                    checked={uninstallWithLastBeaconDelete}
                    disabled={deletePendingKey != null}
                    onCheckedChange={(v) => setUninstallWithLastBeaconDelete(v === true)}
                  />
                  <div className="min-w-0">
                    <Label htmlFor={lastBeaconUninstallChoiceId}>Also uninstall Beacons on this page</Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Removes the hidden beacons install wrapper, if any, and the footer beacon script when Tower is
                      configured. Publish the site for the live page to match.
                    </p>
                  </div>
                </div>
              ) : null}
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
      </ScrollArea>
    </div>
  );
}
