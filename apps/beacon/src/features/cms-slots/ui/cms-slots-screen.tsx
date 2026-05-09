import { type MutableRefObject, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ensureListTargetAfterAppendingSlotRow } from "@/features/cms-slots/model/append-slot-list-component-flow";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  listComposableMetaByInstanceKey,
  mergeComposableMetaWithLive,
} from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  cmsSlotCompositionSignature,
  draftToHiddenListIndices,
  normalizeComposerDraftPropValues,
  resolveComposerTargetOrder,
} from "@/features/cms-slots/model/cms-slot-composer-cms-draft";
import { listComposerEligibleLists } from "@/features/cms-slots/model/cms-slot-composer-eligible";
import type { CmsSlotComposerRowMeta } from "@/features/cms-slots/model/cms-slot-composer-row-meta";
import {
  type CmsSlotEngineSlotPropsFile,
  readCmsSlotEngineSlotPropsFile,
  writeCmsSlotEngineSlotPropsFile,
} from "@/features/cms-slots/model/cms-slot-engine-slot-props";
import {
  getCmsSlotListTargetCmsFieldIdFromListContainer,
  resolveCmsSlotListTargetCmsCollectionIdForCleanup,
  tryDeleteCmsSlotListTargetCmsPlainTextField,
} from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import { clearAllCmsSlotListTargetDesignerPreviewsOnPage } from "@/features/cms-slots/model/cms-slot-list-target-designer-preview";
import {
  listCmsSlotListTargetInstancesOnPage,
  removeAllCmsSlotListTargetInstancesOnPage,
} from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";
import { getCmsSlotPageRuntimeSyncStatus } from "@/features/cms-slots/model/cms-slot-page-inline-script";
import {
  type CmsSlotListOnPage,
  cmsSlotListKey,
  filterHydratedCmsSlotRowsByComponentIds,
  findCmsSlotListsOnPage,
  type HydratedCmsSlotRow,
  listInstancesInSlotListContainer,
  resolveCmsSlotEngineConfiguredComponentIds,
  writeCmsSlotEngineConfiguredComponentIds,
} from "@/features/cms-slots/model/cms-slot-page-targets";
import { loadComposerStudioSynchronizedState } from "@/features/cms-slots/model/composer-studio-sync";
import {
  CMS_SLOT_UTILITIES_COMPONENT_GROUP,
  createCmsSlotListTargetComponent,
  getCmsSlotListTargetComponentOrNull,
} from "@/features/cms-slots/model/create-cms-slot-list-target-component";
import { createCmsSlotListOnPage } from "@/features/cms-slots/model/create-cms-slot-target";
import { executeCmsSlotComposerSave } from "@/features/cms-slots/model/execute-cms-slot-composer-save";
import {
  installCmsSlotsWrapperOnPage,
  isCmsSlotsWrapperInstalledOnPage,
  removeCmsSlotsWrapperIfNoSlotListsOnPage,
  syncCmsSlotsInstallEmbedOnPage,
  uninstallCmsSlotsPageInstall,
} from "@/features/cms-slots/model/install-cms-slots-wrapper";
import { paletteForConfiguredComponentIds } from "@/features/cms-slots/model/palette-for-configured-component-ids";
import { placeCmsSlotListTargetOnCanvas } from "@/features/cms-slots/model/place-cms-slot-list-target-on-canvas";
import { resyncEngineSlotPropAttributesForSlotIndex } from "@/features/cms-slots/model/resync-engine-slot-prop-attrs";
import {
  appendComponentToSlotListContainer,
  type CmsSlotCompositionDraftRow,
  type CmsSlotPaletteEntry,
  deleteCmsSlotListAndListTargetDefinition,
  listSiteComponentsForPicker,
  removeComponentInstanceFromCanvas,
} from "@/features/cms-slots/model/site-components";
import { CmsSlotsRouteChrome } from "@/features/cms-slots/ui/cms-slots-route-chrome";
import {
  CMS_SLOTS_ENGINE_LIST_CHANGED_SYNC_REASON,
  CMS_SLOTS_TOAST_LIST_CREATED,
  CMS_SLOTS_TOAST_LIST_REMOVED,
  CMS_SLOTS_TOAST_LIST_REMOVED_PAGE_CLEARED,
} from "@/shared/lib/cms-slots-feature-copy";
import { formatWebflowDesignerError } from "@/shared/lib/webflow-designer-error";

const LIST_TARGET_COMPONENT_NOT_FOUND_MESSAGE =
  "No matching list target component found. It may have been renamed, moved, or deleted in the Components panel.";

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
  setListTargetPhase: (p: CmsSlotListTargetPhase) => void,
  setListTargetRegisteredName: (n: string | null) => void,
  onSettled?: (result: { phase: "synced" | "absent"; registeredName: string | null }) => void,
  onAbsent?: () => void
) {
  const stale = () => listTargetResolveGen.current !== myGen;
  setListTargetPhase("updating");
  try {
    const comp = await getCmsSlotListTargetComponentOrNull(
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
    void webflow.notify({ type: "Error", message: formatWebflowDesignerError(e) });
  }
}

/**
 * `CmsSlotsScreen` is wrapped by a parent route element; `useParams` is often empty. Prefer `pathname` from
 * `useLocation`, then the hash (HashRouter) if needed.
 */
function parseCmsSlotsRouteSegment(pathname: string, locationHash: string): "engine" | "composer" | null {
  for (const raw of [pathname, locationHash.replace(/^#/, "")].filter(Boolean)) {
    const p = raw.startsWith("/") ? raw : `/${raw}`;
    const m = /^\/(?:cms-slots|beacons)\/(engine|composer)\/?$/.exec(p);
    if (m != null) {
      return m[1] as "engine" | "composer";
    }
  }
  return null;
}

function useCmsSlotsInvalidSegmentRedirect(
  segmentFromPath: "engine" | "composer" | null,
  routePathname: string,
  routeHash: string,
  navigate: (to: string, options?: { replace?: boolean }) => void
) {
  useEffect(() => {
    if (segmentFromPath != null) return;
    for (const raw of [routePathname, routeHash.replace(/^#/, "")].filter(Boolean)) {
      const p = raw.startsWith("/") ? raw : `/${raw}`;
      const m = /^\/(?:cms-slots|beacons)\/([^/]+)\/?$/.exec(p);
      if (m != null && m[1] !== "engine" && m[1] !== "composer") {
        void navigate("/cms-slots/engine", { replace: true });
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
          await clearAllCmsSlotListTargetDesignerPreviewsOnPage();
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
  setSelected: (v: HydratedCmsSlotRow[]) => void;
  setComposerStudio: (v: { beacon: CmsSlotListOnPage; initialSignature: string } | null) => void;
  setComposerDraft: (v: CmsSlotCompositionDraftRow[]) => void;
  setComposerAllowedPalette: (v: CmsSlotPaletteEntry[]) => void;
  setComposerEngineRows: (v: HydratedCmsSlotRow[]) => void;
  setComposerEngineComposable: (v: Record<string, ComposableInstancePropMeta[]>) => void;
  setComposerSlotProps: (v: CmsSlotEngineSlotPropsFile | null) => void;
  setEngineListSlotFile: (v: CmsSlotEngineSlotPropsFile | null) => void;
  setComposerOpeningKey: (v: string | null) => void;
  setBeaconName: (v: string) => void;
  setListTargetCreatePending: (v: boolean) => void;
  setListTargetRemovePending: (v: boolean) => void;
  setListTargetRemoveBusyKind: (v: "canvas" | "delete" | null) => void;
  setListTargetPlaceOnCanvasPending: (v: boolean) => void;
  setListTargetPhase: (v: CmsSlotListTargetPhase) => void;
  setListTargetRegisteredName: (v: string | null) => void;
  setListTargetOnCanvasCount: (v: number) => void;
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
        void navigate("/cms-slots/engine", { replace: true });
        reset.setComposerStudio(null);
        reset.setComposerDraft([]);
        reset.setComposerAllowedPalette([]);
        reset.setComposerEngineRows([]);
        reset.setComposerEngineComposable({});
        reset.setComposerSlotProps(null);
        reset.setEngineListSlotFile(null);
        reset.setComposerOpeningKey(null);
        reset.setBeaconName("");
        reset.setListTargetCreatePending(false);
        reset.setListTargetRemovePending(false);
        reset.setListTargetRemoveBusyKind(null);
        reset.setListTargetPlaceOnCanvasPending(false);
        reset.setListTargetPhase("loading");
        reset.setListTargetRegisteredName(null);
        reset.setListTargetOnCanvasCount(0);
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
                await clearAllCmsSlotListTargetDesignerPreviewsOnPage();
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
        syncShellReason: CMS_SLOTS_ENGINE_LIST_CHANGED_SYNC_REASON,
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
  setListTargetPhase: (p: CmsSlotListTargetPhase) => void,
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
  listTargetPhase: CmsSlotListTargetPhase,
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
        const list = await listCmsSlotListTargetInstancesOnPage(activeDataList, listContainer, {
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

export function CmsSlotsScreen() {
  const nameFieldId = useId();
  const searchFieldId = useId();
  const lastBeaconUninstallChoiceId = useId();
  const { segment: segmentParam } = useParams();
  const { pathname: routePathname, hash: routeHash } = useLocation();
  const segmentFromPath = parseCmsSlotsRouteSegment(routePathname, routeHash);
  /** Matched route param is authoritative; fall back to parsed path for older/wrapper edge cases. */
  const segment: "engine" | "composer" =
    segmentParam === "engine" || segmentParam === "composer" ? segmentParam : (segmentFromPath ?? "engine");
  const navigate = useNavigate();
  const [pageBeacons, setPageBeacons] = useState<CmsSlotListOnPage[]>([]);
  const [pageScanLoading, setPageScanLoading] = useState(true);
  const [beaconsWrapperInstalled, setBeaconsWrapperInstalled] = useState(false);
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
  const [selected, setSelected] = useState<HydratedCmsSlotRow[]>([]);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [resyncingEngineSlotKey, setResyncingEngineSlotKey] = useState<string | null>(null);
  const [listTargetCreatePending, setListTargetCreatePending] = useState(false);
  const [listTargetRemovePending, setListTargetRemovePending] = useState(false);
  const [listTargetRemoveBusyKind, setListTargetRemoveBusyKind] = useState<"canvas" | "delete" | null>(null);
  const [listTargetPlaceOnCanvasPending, setListTargetPlaceOnCanvasPending] = useState(false);
  const [listTargetPhase, setListTargetPhase] = useState<CmsSlotListTargetPhase>("loading");
  const [, setListTargetRegisteredName] = useState<string | null>(null);
  const [listTargetOnCanvasCount, setListTargetOnCanvasCount] = useState(0);
  const [removeListTargetDialogOpen, setRemoveListTargetDialogOpen] = useState(false);
  const [activeBeaconKey, setActiveBeaconKey] = useState<string | null>(null);
  const listTargetResolveGen = useRef(0);
  /** Last known list target registration for a beacon; avoids re-querying Webflow on repeat opens. */
  const listTargetReconcileCacheRef = useRef<ListTargetReconcileCacheEntry | null>(null);
  const [openingBeaconKey, setOpeningBeaconKey] = useState<string | null>(null);
  const [beaconToDelete, setBeaconToDelete] = useState<CmsSlotListOnPage | null>(null);
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
  const [composerEligible, setComposerEligible] = useState<CmsSlotListOnPage[]>([]);
  const [composerRuntimeOk, setComposerRuntimeOk] = useState(false);
  const [composerStudio, setComposerStudio] = useState<{ beacon: CmsSlotListOnPage; initialSignature: string } | null>(
    null
  );
  const [composerDraft, setComposerDraft] = useState<CmsSlotCompositionDraftRow[]>([]);
  const [composerEngineRows, setComposerEngineRows] = useState<HydratedCmsSlotRow[]>([]);
  const [composerEngineComposable, setComposerEngineComposable] = useState<
    Record<string, ComposableInstancePropMeta[]>
  >({});
  const [composerSlotProps, setComposerSlotProps] = useState<CmsSlotEngineSlotPropsFile | null>(null);
  const [composerAllowedPalette, setComposerAllowedPalette] = useState<CmsSlotPaletteEntry[]>([]);
  const [composerOpeningKey, setComposerOpeningKey] = useState<string | null>(null);
  const [engineListSlotFile, setEngineListSlotFile] = useState<CmsSlotEngineSlotPropsFile | null>(null);
  const [composerSavePending, setComposerSavePending] = useState(false);
  const [currentCmsItemId, setCurrentCmsItemId] = useState<string | null>(null);
  const composerStudioRef = useRef<{
    beacon: CmsSlotListOnPage;
    initialSignature: string;
  } | null>(null);
  composerStudioRef.current = composerStudio;

  const refreshPageBeacons = useCallback(async () => {
    setPageScanLoading(true);
    setPageRuntimeStatusLoading(true);
    const runtimePromise = getCmsSlotPageRuntimeSyncStatus()
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
      const [found, installed] = await Promise.all([findCmsSlotListsOnPage(), isCmsSlotsWrapperInstalledOnPage()]);
      setPageBeacons(found);
      setBeaconsWrapperInstalled(installed);
    } catch {
      setPageBeacons([]);
      setBeaconsWrapperInstalled(false);
    } finally {
      setPageScanLoading(false);
    }

    await runtimePromise;
  }, []);

  const loadComposerEligible = useCallback(async () => {
    setComposerEligibleLoading(true);
    try {
      const found = await findCmsSlotListsOnPage();
      const r = await listComposerEligibleLists(found);
      setComposerEligible(r.eligible);
      setComposerRuntimeOk(r.runtimeOk);
      setPageRuntimeSynced(r.pageRuntimeSynced);
      setPageRuntimeSyncReason(r.runtimeOk ? undefined : r.runtimeReason);
    } catch {
      setComposerEligible([]);
      setComposerRuntimeOk(false);
      try {
        const runtime = await getCmsSlotPageRuntimeSyncStatus();
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

  const isLastCmsSlotListOnPageForDelete = useMemo(() => {
    if (beaconToDelete == null) return false;
    return pageBeacons.length === 1 && pageBeacons[0]?.key === beaconToDelete.key;
  }, [beaconToDelete, pageBeacons]);

  useEffect(() => {
    void refreshPageBeacons();
  }, [refreshPageBeacons]);

  useCmsSlotsInvalidSegmentRedirect(segmentFromPath, routePathname, routeHash, navigate);

  useEffect(() => {
    if (!isComposer) return;
    void loadComposerEligible();
  }, [isComposer, loadComposerEligible]);

  useEffect(() => {
    if (typeof webflow.subscribe !== "function") {
      return undefined;
    }
    const unsub = webflow.subscribe("currentcmsitem", (id) => {
      setCurrentCmsItemId(id != null && String(id).trim() !== "" ? String(id) : null);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!isComposer) {
      return undefined;
    }
    const studio = composerStudioRef.current;
    if (studio == null) {
      return undefined;
    }
    const beacon = studio.beacon;
    let cancelled = false;
    void (async () => {
      try {
        const result = await loadComposerStudioSynchronizedState({
          slotList: beacon,
          currentCmsItemId,
          shouldAbort: () => cancelled,
        });
        if (result == null || cancelled) {
          return;
        }
        setComposerAllowedPalette(result.allowedPalette);
        setComposerEngineRows(result.engineScopedRows);
        setComposerEngineComposable(result.composerEngineComposable);
        setComposerSlotProps(result.composerSlotProps);
        setComposerDraft(result.draft);
        setComposerStudio((prev) =>
          prev == null || prev.beacon.key !== beacon.key ? prev : { ...prev, initialSignature: result.initialSignature }
        );
      } catch (e) {
        if (!cancelled) {
          console.warn("[cms-slots] composer context reload", e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isComposer, currentCmsItemId]);

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
    setComposerEngineRows,
    setComposerEngineComposable,
    setComposerSlotProps,
    setEngineListSlotFile,
    setComposerOpeningKey,
    setBeaconName,
    setListTargetCreatePending,
    setListTargetRemovePending,
    setListTargetRemoveBusyKind,
    setListTargetPlaceOnCanvasPending,
    setListTargetPhase,
    setListTargetRegisteredName,
    setListTargetOnCanvasCount,
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
      setCatalogError(formatWebflowDesignerError(err));
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
    setListTargetRemoveBusyKind(null);
    setListTargetPlaceOnCanvasPending(false);
    setListTargetPhase("loading");
    setListTargetRegisteredName(null);
    setListTargetOnCanvasCount(0);
    setRemoveListTargetDialogOpen(false);
    setActiveBeaconKey(null);
    setEngineListSlotFile(null);
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

  const handleOpenBeacon = async (beacon: CmsSlotListOnPage) => {
    setCreateFormOpen(false);
    setOpeningBeaconKey(beacon.key);
    try {
      const rows = await listInstancesInSlotListContainer(beacon.container);
      listTargetDefinitionIdRef.current = null;
      targetRef.current = beacon.container;
      setActiveDataList(beacon.dataList);
      setActiveBeaconKey(beacon.key);
      setSelected(rows);
      const f = await readCmsSlotEngineSlotPropsFile(beacon.container, rows.length);
      setEngineListSlotFile(f);
      setPicking(true);
    } catch (err) {
      const message = formatWebflowDesignerError(err);
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
      const { container, dataList } = await createCmsSlotListOnPage(trimmed);
      const { component: listTargetComponent, definitionId } = await createCmsSlotListTargetComponent({
        dataList,
        listContainer: container,
      });
      listTargetDefinitionIdRef.current = definitionId;
      const listTargetRegisteredName = await listTargetComponent.getName();
      setListTargetPhase("synced");
      setListTargetRegisteredName(listTargetRegisteredName);
      await writeCmsSlotEngineConfiguredComponentIds(container, []);
      await placeCmsSlotListTargetOnCanvas(dataList, container, definitionId);
      const listTargetOnPage = await listCmsSlotListTargetInstancesOnPage(dataList, container, {
        preferredDefinitionId: definitionId,
      });
      targetRef.current = container;
      setActiveDataList(dataList);
      const beaconKey = cmsSlotListKey(container);
      setActiveBeaconKey(beaconKey);
      setSelected([]);
      setPicking(true);
      setCreateFormOpen(false);
      setListTargetOnCanvasCount(listTargetOnPage.length);
      listTargetReconcileCacheRef.current = {
        beaconKey,
        dataList,
        phase: "synced",
        registeredName: listTargetRegisteredName,
      };
      void webflow.notify({ type: "Success", message: CMS_SLOTS_TOAST_LIST_CREATED });
      void refreshPageBeacons();
    } catch (err) {
      const message = formatWebflowDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setCreatePending(false);
    }
  };

  const selectedComponentIdSet = useMemo(() => new Set(selected.map((s) => s.componentId)), [selected]);

  const composerDirty = useMemo(() => {
    if (composerStudio == null) return false;
    return cmsSlotCompositionSignature(composerDraft) !== composerStudio.initialSignature;
  }, [composerDraft, composerStudio]);

  const composerRowMeta = useMemo((): CmsSlotComposerRowMeta[] => {
    if (composerSlotProps == null || composerEngineRows.length === 0) {
      return composerDraft.map((row) => ({ row, exposed: [] as ComposableInstancePropMeta[] }));
    }
    const map = draftToHiddenListIndices(composerEngineRows, composerDraft);
    if (!map.ok) {
      return composerDraft.map((row) => ({ row, exposed: [] as ComposableInstancePropMeta[] }));
    }
    return composerDraft.map((row, j) => {
      const idx = map.indices[j];
      const raw = idx != null ? (composerSlotProps.slots[idx]?.exposed ?? []) : [];
      const engineRow = idx != null ? composerEngineRows[idx] : undefined;
      const live = engineRow != null ? composerEngineComposable[engineRow.key] : undefined;
      return {
        row,
        exposed: mergeComposableMetaWithLive(raw, live),
      };
    });
  }, [composerDraft, composerEngineRows, composerEngineComposable, composerSlotProps]);

  const handleOpenComposerStudio = async (beacon: CmsSlotListOnPage) => {
    setComposerOpeningKey(beacon.key);
    try {
      const rows = await listInstancesInSlotListContainer(beacon.container);
      const configuredComponentIds = await resolveCmsSlotEngineConfiguredComponentIds(beacon.container, rows);
      const engineScopedRows = filterHydratedCmsSlotRowsByComponentIds(rows, configuredComponentIds);
      const allowedPalette = await paletteForConfiguredComponentIds(configuredComponentIds, rows);
      setComposerAllowedPalette(allowedPalette);
      setComposerEngineRows(engineScopedRows);
      const liveComposable = await listComposableMetaByInstanceKey(engineScopedRows);
      setComposerEngineComposable(liveComposable);
      const sp = await readCmsSlotEngineSlotPropsFile(beacon.container, engineScopedRows.length);
      setComposerSlotProps(sp);
      const { draft: rawDraft } = await resolveComposerTargetOrder({
        listContainer: beacon.container,
        engineScopedRows,
        currentCmsItemId,
      });
      const mapped = draftToHiddenListIndices(engineScopedRows, rawDraft);
      const draft = mapped.ok
        ? normalizeComposerDraftPropValues(rawDraft, mapped.indices, engineScopedRows, sp, liveComposable)
        : rawDraft;
      const initialSignature = cmsSlotCompositionSignature(draft);
      setComposerDraft(draft);
      setComposerStudio({ beacon, initialSignature });
    } catch (err) {
      const message = formatWebflowDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setComposerOpeningKey(null);
    }
  };

  const handleComposerStudioBack = useCallback(() => {
    setComposerStudio(null);
    setComposerDraft([]);
    setComposerEngineRows([]);
    setComposerEngineComposable({});
    setComposerSlotProps(null);
    setComposerAllowedPalette([]);
  }, []);

  const handleComposerAddFromPalette = useCallback((c: CmsSlotPaletteEntry) => {
    setComposerDraft((prev) => [
      ...prev,
      { key: crypto.randomUUID(), componentId: c.id, name: c.name, propValues: {} },
    ]);
  }, []);

  const handleComposerSetPropValue = useCallback((rowKey: string, propId: string, value: string) => {
    setComposerDraft((prev) =>
      prev.map((r) => (r.key === rowKey ? { ...r, propValues: { ...(r.propValues ?? {}), [propId]: value } } : r))
    );
  }, []);

  const handleComposerRenameSlotRow = useCallback((rowKey: string, name: string) => {
    setComposerDraft((prev) => prev.map((r) => (r.key === rowKey ? { ...r, name } : r)));
  }, []);

  const handleSetEngineSlotExposed = useCallback(
    async (slotIndex: number, exposed: ComposableInstancePropMeta[]) => {
      const container = targetRef.current;
      if (container == null) return;
      const n = selected.length;
      const f = await readCmsSlotEngineSlotPropsFile(container, n);
      const nextSlots = f.slots.slice(0, n);
      while (nextSlots.length < n) {
        nextSlots.push({ exposed: [] });
      }
      nextSlots[slotIndex] = { exposed: [...exposed] };
      const out: CmsSlotEngineSlotPropsFile = { v: 1, slots: nextSlots };
      await writeCmsSlotEngineSlotPropsFile(container, out);
      setEngineListSlotFile(out);
      setEngineListCompositionStale(true);
    },
    [selected]
  );

  const handleResyncEngineSlotAttrs = useCallback(
    async (slotIndex: number) => {
      await resyncEngineSlotPropAttributesForSlotIndex({
        slotIndex,
        selected,
        container: targetRef.current,
        setResyncingEngineSlotKey,
        setSelected,
      });
    },
    [selected]
  );

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
    if (composerDraft.length === 0) {
      void webflow.notify({ type: "Error", message: "Add at least one component before saving." });
      return;
    }
    setComposerSavePending(true);
    try {
      await executeCmsSlotComposerSave({
        beacon: composerStudio.beacon,
        composerDraft,
        composerAllowedPalette,
        composerEngineComposable,
        currentCmsItemId,
        listTargetDefinitionIdRef,
        setters: {
          setComposerDraft,
          setComposerStudio,
          setComposerEngineRows,
          setComposerEngineComposable,
          setComposerSlotProps,
        },
        onCompleteSideEffects: () => {
          setEngineListCompositionStale(false);
          void refreshPageBeacons();
          void loadComposerEligible();
        },
      });
    } catch (err) {
      const message = formatWebflowDesignerError(err);
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
      const instance = await appendComponentToSlotListContainer(container, c.id);
      const nextSelected = [...selected, { key: crypto.randomUUID(), componentId: c.id, name: c.name, instance }];
      setSelected(nextSelected);
      await writeCmsSlotEngineConfiguredComponentIds(
        container,
        nextSelected.map((row) => row.componentId)
      );
      const slotF = await readCmsSlotEngineSlotPropsFile(container, nextSelected.length);
      await writeCmsSlotEngineSlotPropsFile(container, slotF);
      setEngineListSlotFile(slotF);
      setEngineListCompositionStale(true);
      void refreshPageBeacons();

      const dataList = activeDataList;
      if (dataList != null) {
        await ensureListTargetAfterAppendingSlotRow({
          dataList,
          container,
          listTargetDefinitionIdRef,
          activeBeaconKey,
          listTargetReconcileCacheRef,
          setListTargetPhase,
          setListTargetRegisteredName,
          setListTargetOnCanvasCount,
        });
      }
    } catch (err) {
      const message = formatWebflowDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setAddPending(false);
    }
  };

  const handleSyncInstallEmbed = async () => {
    if (embedSyncPending) return;
    setEmbedSyncPending(true);
    try {
      await syncCmsSlotsInstallEmbedOnPage();
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
      const message = formatWebflowDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setEmbedSyncPending(false);
    }
  };

  const handleInstallWrapper = async () => {
    if (installPending) return;
    setInstallPending(true);
    try {
      const r = await installCmsSlotsWrapperOnPage();
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
      setCreateFormOpen(true);
      setEngineListCompositionStale(false);
      void refreshPageBeacons();
    } catch (err) {
      const message = formatWebflowDesignerError(err);
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
      const cmsCollectionIdForCleanup = await resolveCmsSlotListTargetCmsCollectionIdForCleanup(target.container);
      const cmsFieldIdForCleanup = await getCmsSlotListTargetCmsFieldIdFromListContainer(target.container);
      await deleteCmsSlotListAndListTargetDefinition(target.dataList, target.container);
      if (cmsCollectionIdForCleanup != null) {
        await tryDeleteCmsSlotListTargetCmsPlainTextField(
          cmsCollectionIdForCleanup,
          target.dataList,
          cmsFieldIdForCleanup
        );
      }
      if (shouldUninstallPage) {
        await uninstallCmsSlotsPageInstall();
        await removeCmsSlotsWrapperIfNoSlotListsOnPage();
      }
      setBeaconToDelete(null);
      setUninstallWithLastBeaconDelete(false);
      void webflow.notify({
        type: "Success",
        message: shouldUninstallPage ? CMS_SLOTS_TOAST_LIST_REMOVED_PAGE_CLEARED : CMS_SLOTS_TOAST_LIST_REMOVED,
      });
      setEngineListCompositionStale(true);
      void refreshPageBeacons();
    } catch (err) {
      const message = formatWebflowDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setDeletePendingKey(null);
    }
  };

  const handleRemove = async (row: HydratedCmsSlotRow) => {
    if (removingKey) return;
    const container = targetRef.current;
    if (!container) return;
    setRemovingKey(row.key);
    try {
      await removeComponentInstanceFromCanvas(row.instance);
      const nextSelected = selected.filter((p) => p.key !== row.key);
      const removeIdx = selected.findIndex((p) => p.key === row.key);
      setSelected(nextSelected);
      await writeCmsSlotEngineConfiguredComponentIds(
        container,
        nextSelected.map((entry) => entry.componentId)
      );
      const f = await readCmsSlotEngineSlotPropsFile(container, selected.length);
      const nextSlots = removeIdx >= 0 ? f.slots.filter((_, j) => j !== removeIdx) : f.slots;
      const out: CmsSlotEngineSlotPropsFile = { v: 1, slots: nextSlots };
      await writeCmsSlotEngineSlotPropsFile(container, out);
      setEngineListSlotFile(out);
      setEngineListCompositionStale(true);
      void refreshPageBeacons();
    } catch (err) {
      const message = formatWebflowDesignerError(err);
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
      const { component: created, definitionId } = await createCmsSlotListTargetComponent({
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
        message: `List target “${registeredName}” added under ${CMS_SLOT_UTILITIES_COMPONENT_GROUP}.`,
      });
    } catch (err) {
      const message = formatWebflowDesignerError(err);
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
      const { instance, alreadyExisted } = await placeCmsSlotListTargetOnCanvas(
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
        const list = await listCmsSlotListTargetInstancesOnPage(activeDataList, listContainer, {
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
      const message = formatWebflowDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setListTargetPlaceOnCanvasPending(false);
    }
  };

  const handleRequestRemoveListTarget = () => {
    if (listTargetPhase !== "synced" || listTargetCreatePending || listTargetRemovePending) {
      return;
    }
    setRemoveListTargetDialogOpen(true);
  };

  const handleRemoveListTargetFromCanvasOnly = async () => {
    if (listTargetRemovePending || activeDataList == null) return;
    const listContainer = targetRef.current;
    if (!listContainer) return;
    setListTargetRemoveBusyKind("canvas");
    setListTargetRemovePending(true);
    const preferredId = listTargetDefinitionIdRef.current;
    try {
      const comp = await getCmsSlotListTargetComponentOrNull(activeDataList, listContainer, preferredId);
      if (comp == null) {
        void webflow.notify({ type: "Warning", message: LIST_TARGET_COMPONENT_NOT_FOUND_MESSAGE });
      } else {
        await removeAllCmsSlotListTargetInstancesOnPage(activeDataList, listContainer, {
          preferredDefinitionId: preferredId,
        });
        void webflow.notify({
          type: "Success",
          message:
            "List target removed from the canvas. The component stays in Components → Beacon Utilities — use Place on canvas to add it again.",
        });
      }
      setRemoveListTargetDialogOpen(false);
      try {
        const list = await listCmsSlotListTargetInstancesOnPage(activeDataList, listContainer, {
          preferredDefinitionId: listTargetDefinitionIdRef.current,
        });
        setListTargetOnCanvasCount(list.length);
      } catch {
        setListTargetOnCanvasCount(0);
      }
      void refreshPageBeacons();
    } catch (err) {
      const message = formatWebflowDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setListTargetRemovePending(false);
      setListTargetRemoveBusyKind(null);
    }
  };

  const handleConfirmDeleteListTargetCompletely = async () => {
    if (listTargetRemovePending || activeDataList == null) return;
    const listContainer = targetRef.current;
    if (!listContainer) return;
    setListTargetRemoveBusyKind("delete");
    setListTargetRemovePending(true);
    const preferredId = listTargetDefinitionIdRef.current;
    try {
      const comp = await getCmsSlotListTargetComponentOrNull(activeDataList, listContainer, preferredId);
      if (comp == null) {
        void webflow.notify({ type: "Warning", message: LIST_TARGET_COMPONENT_NOT_FOUND_MESSAGE });
      } else {
        await removeAllCmsSlotListTargetInstancesOnPage(activeDataList, listContainer, {
          preferredDefinitionId: preferredId,
        });
        await webflow.unregisterComponent(comp);
        void webflow.notify({
          type: "Success",
          message:
            "List target component removed from the site. The CMS plain text field for this beacon list is unchanged — delete the beacon list to remove that field.",
        });
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
      const message = formatWebflowDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setListTargetRemovePending(false);
      setListTargetRemoveBusyKind(null);
    }
  };

  return (
    <CmsSlotsRouteChrome
      navigate={navigate}
      nameFieldId={nameFieldId}
      searchFieldId={searchFieldId}
      lastBeaconUninstallChoiceId={lastBeaconUninstallChoiceId}
      showPageRuntimeSyncHeader={showPageRuntimeSyncHeader}
      pageRuntimeStatusLoading={pageRuntimeStatusLoading}
      syncShellOk={syncShellOk}
      syncShellReason={syncShellReason}
      isEngine={isEngine}
      isComposer={isComposer}
      picking={picking}
      activeDataList={activeDataList}
      beaconsWrapperInstalled={beaconsWrapperInstalled}
      installPending={installPending}
      pageBeacons={pageBeacons}
      pageScanLoading={pageScanLoading}
      beaconName={beaconName}
      setBeaconName={setBeaconName}
      createPending={createPending}
      createFormOpen={createFormOpen}
      setCreateFormOpen={setCreateFormOpen}
      openingBeaconKey={openingBeaconKey}
      deletePendingKey={deletePendingKey}
      setBeaconToDelete={setBeaconToDelete}
      onCreate={handleCreate}
      onOpenBeacon={handleOpenBeacon}
      onInstallWrapper={handleInstallWrapper}
      componentQuery={componentQuery}
      setComponentQuery={setComponentQuery}
      catalogLoading={catalogLoading}
      catalogError={catalogError}
      componentCatalog={componentCatalog}
      selected={selected}
      selectedComponentIdSet={selectedComponentIdSet}
      addPending={addPending}
      onAddComponent={handleAddComponent}
      onRemoveRow={handleRemove}
      removingKey={removingKey}
      listTargetPhase={listTargetPhase}
      listTargetOnCanvasCount={listTargetOnCanvasCount}
      onCreateListTarget={handleCreateListTarget}
      onRequestRemoveListTarget={handleRequestRemoveListTarget}
      onPlaceListTargetOnCanvas={handlePlaceListTargetOnCanvas}
      listTargetCreatePending={listTargetCreatePending}
      listTargetRemovePending={listTargetRemovePending}
      listTargetPlaceOnCanvasPending={listTargetPlaceOnCanvasPending}
      engineListSlotFile={engineListSlotFile}
      onSetEngineSlotExposed={handleSetEngineSlotExposed}
      onResyncEngineSlotAttrs={handleResyncEngineSlotAttrs}
      resyncingEngineSlotKey={resyncingEngineSlotKey}
      exitToList={exitToList}
      composerEligibleLoading={composerEligibleLoading}
      composerRuntimeOk={composerRuntimeOk}
      composerEligible={composerEligible}
      composerOpeningKey={composerOpeningKey}
      onOpenComposerStudio={handleOpenComposerStudio}
      onRefreshComposerEligible={loadComposerEligible}
      composerStudio={composerStudio}
      composerDraft={composerDraft}
      composerDirty={composerDirty}
      composerAllowedPalette={composerAllowedPalette}
      onComposerAddFromPalette={handleComposerAddFromPalette}
      onComposerReorderDraft={handleComposerReorderDraft}
      onComposerRemoveDraft={handleComposerRemoveDraft}
      onComposerStudioBack={handleComposerStudioBack}
      onComposerSave={handleComposerSave}
      composerSavePending={composerSavePending}
      onSyncInstallEmbed={handleSyncInstallEmbed}
      embedSyncPending={embedSyncPending}
      composerRowMeta={composerRowMeta}
      onComposerSetPropValue={handleComposerSetPropValue}
      onComposerRenameSlotRow={handleComposerRenameSlotRow}
      beaconToDelete={beaconToDelete}
      isLastCmsSlotListOnPageForDelete={isLastCmsSlotListOnPageForDelete}
      uninstallWithLastBeaconDelete={uninstallWithLastBeaconDelete}
      setUninstallWithLastBeaconDelete={setUninstallWithLastBeaconDelete}
      onConfirmDeleteBeacon={handleConfirmDeleteBeacon}
      removeListTargetDialogOpen={removeListTargetDialogOpen}
      setRemoveListTargetDialogOpen={setRemoveListTargetDialogOpen}
      listTargetRemoveBusyKind={listTargetRemoveBusyKind}
      setListTargetRemoveBusyKind={setListTargetRemoveBusyKind}
      onRemoveListTargetFromCanvasOnly={handleRemoveListTargetFromCanvasOnly}
      onConfirmDeleteListTargetCompletely={handleConfirmDeleteListTargetCompletely}
    />
  );
}
