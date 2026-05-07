import { ChevronLeft, List, PanelsTopLeft, SquareCode } from "lucide-react";
import { type MutableRefObject, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import type { ComposableInstancePropMeta } from "@/features/beacons/model/beacon-composable-props";
import {
  buildBeaconRuntimePropRow,
  listComposableMetaByInstanceKey,
  mergeComposableMetaWithLive,
  mergeComposableMetaWithLiveResolved,
} from "@/features/beacons/model/beacon-composable-props";
import {
  beaconCompositionSignature,
  draftToHiddenListIndices,
  normalizeComposerDraftPropValues,
  resolveComposerTargetOrder,
} from "@/features/beacons/model/beacon-composer-cms-draft";
import { listComposerEligibleLists } from "@/features/beacons/model/beacon-composer-eligible";
import type { BeaconComposerRowMeta } from "@/features/beacons/model/beacon-composer-row-meta";
import {
  BEACON_TAG_ATTRS_DEBUG_PREFIX,
  syncEngineCodalynBeaconPropAttributes,
} from "@/features/beacons/model/beacon-engine-codalyn-attr-sync";
import {
  type BeaconEngineSlotPropsFile,
  mergeSlotFileAfterListRebuild,
  readBeaconEngineSlotPropsFile,
  writeBeaconEngineSlotPropsFile,
} from "@/features/beacons/model/beacon-engine-slot-props";
import {
  saveBeaconListRuntimePayloadToCmsItem,
  setBeaconListTargetInstancesStaticRuntimeText,
} from "@/features/beacons/model/beacon-list-cms-composition-save";
import { serializeBeaconListRuntimePayload } from "@/features/beacons/model/beacon-list-runtime-payload";
import {
  bindBeaconListTargetInstancesToListCmsText,
  ensureBeaconListCmsTextFieldOnList,
  getBeaconListTargetCmsFieldIdFromListContainer,
  getCmsTemplateCollectionIdFromCurrentPage,
  resolveBeaconListTargetCmsCollectionIdForCleanup,
  tryDeleteBeaconListTargetCmsPlainTextField,
} from "@/features/beacons/model/beacon-list-target-cms-text-binding";
import { clearAllBeaconListTargetDesignerPreviewsOnPage } from "@/features/beacons/model/beacon-list-target-designer-preview";
import {
  listBeaconListTargetInstancesOnPage,
  removeAllBeaconListTargetInstancesOnPage,
} from "@/features/beacons/model/beacon-list-target-instances-on-page";
import type { BeaconListTargetPhase } from "@/features/beacons/model/beacon-list-target-phase";
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
import { BeaconComposerStudioPanel } from "@/features/beacons/ui/beacon-composer-studio";
import { BeaconCompositionPanel } from "@/features/beacons/ui/beacon-composition-panel";
import { BeaconHomePanel } from "@/features/beacons/ui/beacon-home-panel";
import { BeaconPageRuntimeHeaderStatus } from "@/features/beacons/ui/beacon-page-runtime-header-status";
import { beaconAppRouteSurfaceClass } from "@/shared/lib/beacon-app-route-surface";
import {
  CMS_SLOTS_AREA_NAV_LABEL,
  CMS_SLOTS_BACK_BUTTON_ARIA_LABEL,
  CMS_SLOTS_DELETE_DIALOG_TITLE,
  CMS_SLOTS_ENGINE_LIST_CHANGED_SYNC_REASON,
  CMS_SLOTS_FEATURE_NAME,
  CMS_SLOTS_SYNC_REQUIRES_INSTALL_TOOLTIP,
  CMS_SLOTS_TOAST_LIST_CREATED,
  CMS_SLOTS_TOAST_LIST_REMOVED,
  CMS_SLOTS_TOAST_LIST_REMOVED_PAGE_CLEARED,
  CMS_SLOTS_UNINSTALL_PAGE_LABEL,
} from "@/shared/lib/cms-slots-feature-copy";
import { getTowerOrigin } from "@/shared/lib/tower-client";
import { cn } from "@/shared/lib/utils";
import { webflowDesignerErrorCauseTag } from "@/shared/lib/webflow-designer-error";
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

function formatDesignerError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Check that you can edit the current page.";
}

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
  setListTargetPhase: (p: BeaconListTargetPhase) => void,
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
  setComposerEngineRows: (v: HydratedBeaconComponent[]) => void;
  setComposerEngineComposable: (v: Record<string, ComposableInstancePropMeta[]>) => void;
  setComposerSlotProps: (v: BeaconEngineSlotPropsFile | null) => void;
  setEngineListSlotFile: (v: BeaconEngineSlotPropsFile | null) => void;
  setComposerOpeningKey: (v: string | null) => void;
  setBeaconName: (v: string) => void;
  setListTargetCreatePending: (v: boolean) => void;
  setListTargetRemovePending: (v: boolean) => void;
  setListTargetRemoveBusyKind: (v: "canvas" | "delete" | null) => void;
  setListTargetPlaceOnCanvasPending: (v: boolean) => void;
  setListTargetPhase: (v: BeaconListTargetPhase) => void;
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
        void navigate("/beacons/engine", { replace: true });
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
  setListTargetPhase: (p: BeaconListTargetPhase) => void,
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
  listTargetPhase: BeaconListTargetPhase,
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
  const [resyncingEngineSlotKey, setResyncingEngineSlotKey] = useState<string | null>(null);
  const [listTargetCreatePending, setListTargetCreatePending] = useState(false);
  const [listTargetRemovePending, setListTargetRemovePending] = useState(false);
  const [listTargetRemoveBusyKind, setListTargetRemoveBusyKind] = useState<"canvas" | "delete" | null>(null);
  const [listTargetPlaceOnCanvasPending, setListTargetPlaceOnCanvasPending] = useState(false);
  const [listTargetPhase, setListTargetPhase] = useState<BeaconListTargetPhase>("loading");
  const [, setListTargetRegisteredName] = useState<string | null>(null);
  const [listTargetOnCanvasCount, setListTargetOnCanvasCount] = useState(0);
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
  const [composerEngineRows, setComposerEngineRows] = useState<HydratedBeaconComponent[]>([]);
  const [composerEngineComposable, setComposerEngineComposable] = useState<
    Record<string, ComposableInstancePropMeta[]>
  >({});
  const [composerSlotProps, setComposerSlotProps] = useState<BeaconEngineSlotPropsFile | null>(null);
  const [composerAllowedPalette, setComposerAllowedPalette] = useState<BeaconPaletteEntry[]>([]);
  const [composerOpeningKey, setComposerOpeningKey] = useState<string | null>(null);
  const [engineListSlotFile, setEngineListSlotFile] = useState<BeaconEngineSlotPropsFile | null>(null);
  const [composerSavePending, setComposerSavePending] = useState(false);
  const [currentCmsItemId, setCurrentCmsItemId] = useState<string | null>(null);
  const composerStudioRef = useRef<{
    beacon: BeaconOnPage;
    initialSignature: string;
  } | null>(null);
  composerStudioRef.current = composerStudio;

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
      const [found, installed] = await Promise.all([findBeaconTargetsOnPage(), isBeaconsWrapperInstalledOnPage()]);
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
    (async () => {
      try {
        const rows = await listInstancesInBeaconTarget(beacon.container);
        const configuredComponentIds = await resolveBeaconEngineConfiguredComponentIds(beacon.container, rows);
        const engineScopedRows = filterHydratedBeaconComponentsByComponentIds(rows, configuredComponentIds);
        const allowedPalette = await beaconPaletteFromConfiguredComponentIds(configuredComponentIds, rows);
        if (cancelled) {
          return;
        }
        setComposerAllowedPalette(allowedPalette);
        setComposerEngineRows(engineScopedRows);
        const byKey = await listComposableMetaByInstanceKey(engineScopedRows);
        if (cancelled) {
          return;
        }
        setComposerEngineComposable(byKey);
        const sp = await readBeaconEngineSlotPropsFile(beacon.container, engineScopedRows.length);
        if (cancelled) {
          return;
        }
        setComposerSlotProps(sp);
        const { draft, initialSignature } = await resolveComposerTargetOrder({
          listContainer: beacon.container,
          engineScopedRows,
          currentCmsItemId,
        });
        if (cancelled) {
          return;
        }
        setComposerDraft(draft);
        setComposerStudio((prev) =>
          prev == null || prev.beacon.key !== beacon.key ? prev : { ...prev, initialSignature }
        );
      } catch (e) {
        if (!cancelled) {
          console.warn("[beacon] composer context reload", e);
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
      const f = await readBeaconEngineSlotPropsFile(beacon.container, rows.length);
      setEngineListSlotFile(f);
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
      const { component: listTargetComponent, definitionId } = await createBeaconListTargetComponent({
        dataList,
        listContainer: container,
      });
      listTargetDefinitionIdRef.current = definitionId;
      const listTargetRegisteredName = await listTargetComponent.getName();
      setListTargetPhase("synced");
      setListTargetRegisteredName(listTargetRegisteredName);
      await writeBeaconEngineConfiguredComponentIds(container, []);
      await placeBeaconListTargetOnCanvas(dataList, container, definitionId);
      const listTargetOnPage = await listBeaconListTargetInstancesOnPage(dataList, container, {
        preferredDefinitionId: definitionId,
      });
      targetRef.current = container;
      setActiveDataList(dataList);
      const beaconKey = beaconTargetKey(container);
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
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setCreatePending(false);
    }
  };

  const selectedComponentIdSet = useMemo(() => new Set(selected.map((s) => s.componentId)), [selected]);

  const composerDirty = useMemo(() => {
    if (composerStudio == null) return false;
    return beaconCompositionSignature(composerDraft) !== composerStudio.initialSignature;
  }, [composerDraft, composerStudio]);

  const composerRowMeta = useMemo((): BeaconComposerRowMeta[] => {
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

  const handleOpenComposerStudio = async (beacon: BeaconOnPage) => {
    setComposerOpeningKey(beacon.key);
    try {
      const rows = await listInstancesInBeaconTarget(beacon.container);
      const configuredComponentIds = await resolveBeaconEngineConfiguredComponentIds(beacon.container, rows);
      const engineScopedRows = filterHydratedBeaconComponentsByComponentIds(rows, configuredComponentIds);
      const allowedPalette = await beaconPaletteFromConfiguredComponentIds(configuredComponentIds, rows);
      setComposerAllowedPalette(allowedPalette);
      setComposerEngineRows(engineScopedRows);
      const liveComposable = await listComposableMetaByInstanceKey(engineScopedRows);
      setComposerEngineComposable(liveComposable);
      const sp = await readBeaconEngineSlotPropsFile(beacon.container, engineScopedRows.length);
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
      const initialSignature = beaconCompositionSignature(draft);
      setComposerDraft(draft);
      setComposerStudio({ beacon, initialSignature });
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
    setComposerEngineRows([]);
    setComposerEngineComposable({});
    setComposerSlotProps(null);
    setComposerAllowedPalette([]);
  }, []);

  const handleComposerAddFromPalette = useCallback((c: BeaconPaletteEntry) => {
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
      const f = await readBeaconEngineSlotPropsFile(container, n);
      const nextSlots = f.slots.slice(0, n);
      while (nextSlots.length < n) {
        nextSlots.push({ exposed: [] });
      }
      nextSlots[slotIndex] = { exposed: [...exposed] };
      const out: BeaconEngineSlotPropsFile = { v: 1, slots: nextSlots };
      await writeBeaconEngineSlotPropsFile(container, out);
      setEngineListSlotFile(out);
      setEngineListCompositionStale(true);
    },
    [selected]
  );

  const handleResyncEngineSlotAttrs = useCallback(
    async (slotIndex: number) => {
      const labelRow = selected[slotIndex];
      if (labelRow == null) {
        console.log(BEACON_TAG_ATTRS_DEBUG_PREFIX, "aborted: no labelRow at slotIndex", slotIndex);
        return;
      }
      const container = targetRef.current;
      if (container == null) {
        console.log(BEACON_TAG_ATTRS_DEBUG_PREFIX, "aborted: targetRef container is null");
        return;
      }
      console.log(BEACON_TAG_ATTRS_DEBUG_PREFIX, "handleResyncEngineSlotAttrs", {
        slotIndex,
        labelRow: { componentId: labelRow.componentId, name: labelRow.name, key: labelRow.key },
      });
      setResyncingEngineSlotKey(labelRow.key);
      try {
        const freshRows = await listInstancesInBeaconTarget(container);
        const configuredIds = await resolveBeaconEngineConfiguredComponentIds(container, freshRows);
        const scoped = filterHydratedBeaconComponentsByComponentIds(freshRows, configuredIds);
        console.log(BEACON_TAG_ATTRS_DEBUG_PREFIX, "canvas + engine filter", {
          freshInstancesCount: freshRows.length,
          freshInstances: freshRows.map((x) => ({ componentId: x.componentId, name: x.name })),
          configuredIds,
          scopedCount: scoped.length,
          scoped: scoped.map((x) => ({ componentId: x.componentId, name: x.name })),
        });

        const row = scoped[slotIndex];
        if (row == null) {
          console.error(BEACON_TAG_ATTRS_DEBUG_PREFIX, "scoped[slotIndex] missing — slot/UI out of sync", {
            slotIndex,
            scopedLength: scoped.length,
          });
          void webflow.notify({
            type: "Error",
            message:
              "That slot no longer matches the beacon list on the page. Close and reopen this beacon, then try tagging again.",
          });
          return;
        }

        const f = await readBeaconEngineSlotPropsFile(container, scoped.length);
        const exposed = f.slots[slotIndex]?.exposed ?? [];
        console.log(BEACON_TAG_ATTRS_DEBUG_PREFIX, "resolved row + exposed props", {
          rowComponentId: row.componentId,
          rowName: row.name,
          exposedPropIds: exposed.map((e) => e.propId),
        });

        const r = await syncEngineCodalynBeaconPropAttributes(row.instance, exposed);
        console.log(BEACON_TAG_ATTRS_DEBUG_PREFIX, "sync result", {
          ...r,
          notifyPath:
            r.errors.length > 0
              ? "Warning (walk errors)"
              : r.tagged === 0 && r.removed === 0 && exposed.length > 0
                ? "Info (nothing tagged)"
                : "Success",
        });

        setSelected((prev) => {
          if (prev.length !== scoped.length) {
            return scoped.map((s) => ({ ...s, key: crypto.randomUUID() }));
          }
          return scoped.map((s, i) => ({
            ...s,
            key: prev[i]?.componentId === s.componentId ? prev[i].key : crypto.randomUUID(),
          }));
        });
        if (r.errors.length > 0) {
          void webflow.notify({ type: "Warning", message: r.errors[0] });
        } else if (r.tagged === 0 && r.removed === 0 && exposed.length > 0) {
          void webflow.notify({
            type: "Info",
            message:
              "No elements were tagged. Open the main component and bind headings, images, or links to the exposed props, then try again.",
          });
        } else {
          void webflow.notify({
            type: "Success",
            message: `Updated ${r.tagged} data attribute(s), removed ${r.removed} stale. Publish the site for the live page.`,
          });
        }
      } catch (e) {
        console.error(BEACON_TAG_ATTRS_DEBUG_PREFIX, "handler catch (same message as Designer toast)", {
          formatted: formatDesignerError(e),
          causeTag: webflowDesignerErrorCauseTag(e),
          err: e,
        });
        void webflow.notify({ type: "Error", message: formatDesignerError(e) });
      } finally {
        setResyncingEngineSlotKey(null);
      }
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
      const rows = await listInstancesInBeaconTarget(beacon.container);
      const configuredComponentIds = await resolveBeaconEngineConfiguredComponentIds(beacon.container, rows);
      const engineScopedRows = filterHydratedBeaconComponentsByComponentIds(rows, configuredComponentIds);
      const mapped = draftToHiddenListIndices(engineScopedRows, draftToApply);
      if (!mapped.ok) {
        void webflow.notify({
          type: "Error",
          message:
            "Your order uses component types that are not available in the Engine list (or not enough instances). Add them in Engine, then try again.",
        });
        return;
      }

      const slotF = await readBeaconEngineSlotPropsFile(beacon.container, engineScopedRows.length);
      const propValueRows: Array<Record<string, string>> = draftToApply.map((d, j) => {
        const poolI = j < mapped.indices.length ? mapped.indices[j] : undefined;
        if (poolI == null) {
          return {};
        }
        const engineRow = engineScopedRows[poolI];
        const rawEx = slotF.slots[poolI]?.exposed ?? [];
        const { metas, aliasToCanonical } = mergeComposableMetaWithLiveResolved(
          rawEx,
          engineRow != null ? composerEngineComposable[engineRow.key] : undefined
        );
        return buildBeaconRuntimePropRow(d, metas, aliasToCanonical);
      });

      const onCmsTemplate = (await getCmsTemplateCollectionIdFromCurrentPage()) != null;
      /** After a static save the hidden list is rebuilt in draft order, so clone indices are 0..n-1. CMS leaves the Engine list as-is, so we keep greedy pool indices. */
      const hiddenListIndicesForRuntime = onCmsTemplate ? mapped.indices : draftToApply.map((_, u) => u);
      const slotLabels = draftToApply.map((d) => d.name);
      const runtimeText = serializeBeaconListRuntimePayload(hiddenListIndicesForRuntime, propValueRows, slotLabels);

      if (onCmsTemplate) {
        if (!getTowerOrigin().trim() || currentCmsItemId == null) {
          void webflow.notify({
            type: "Error",
            message:
              "On a collection template, select a collection item in the Designer and connect Codalyn to Tower. The layout is saved only to the CMS field — the Engine list on the page is not changed.",
          });
          return;
        }
        const binding = await ensureBeaconListCmsTextFieldOnList(beacon.container, beacon.dataList);
        if (binding == null) {
          void webflow.notify({
            type: "Error",
            message:
              "Could not use the list CMS text field. Create and sync a list target for this list, then try again.",
          });
          return;
        }
        const listTargetDef = await getBeaconListTargetComponentOrNull(
          beacon.dataList,
          beacon.container,
          listTargetDefinitionIdRef.current
        );
        if (listTargetDef != null) {
          const listTargetOnPage = await listBeaconListTargetInstancesOnPage(beacon.dataList, beacon.container, {
            preferredDefinitionId: listTargetDefinitionIdRef.current,
          });
          await bindBeaconListTargetInstancesToListCmsText({
            dataList: beacon.dataList,
            listContainer: beacon.container,
            def: listTargetDef,
            instances: listTargetOnPage,
            resolvedBinding: binding,
          });
        }
        let cmsLayoutSaveFailed = false;
        try {
          await saveBeaconListRuntimePayloadToCmsItem({
            collectionId: binding.collectionId,
            fieldId: binding.fieldId,
            cmsItemId: currentCmsItemId,
            hiddenListIndices: hiddenListIndicesForRuntime,
            propValueRows,
            slotLabels,
          });
        } catch (e) {
          cmsLayoutSaveFailed = true;
          console.warn("[beacon] CMS list text save", e);
        }
        await syncBeaconPageInlineScript();
        setComposerDraft(draftToApply);
        setComposerStudio((prev) =>
          prev ? { ...prev, initialSignature: beaconCompositionSignature(draftToApply) } : null
        );
        if (cmsLayoutSaveFailed) {
          void webflow.notify({
            type: "Warning",
            message: "Page script updated, but the CMS list text field was not saved. Check Tower and try again.",
          });
        } else {
          void webflow.notify({
            type: "Success",
            message:
              "Layout saved to the current CMS item’s text field. Page script updated — publish for the live site. The Engine reference list was not changed.",
          });
        }
      } else {
        const beforePoolIds = engineScopedRows.map((r) => r.componentId);
        const oldFile = await readBeaconEngineSlotPropsFile(beacon.container, engineScopedRows.length);
        await applyBeaconCompositionDraft(beacon.container, draftToApply);
        const newFile = mergeSlotFileAfterListRebuild(beforePoolIds, oldFile, draftToApply);
        await writeBeaconEngineSlotPropsFile(beacon.container, newFile);
        await setBeaconListTargetInstancesStaticRuntimeText({
          dataList: beacon.dataList,
          listContainer: beacon.container,
          preferredDefinitionId: listTargetDefinitionIdRef.current,
          text: runtimeText,
        });
        await syncBeaconPageInlineScript();
        setComposerDraft(
          draftToApply.map((d) => ({
            key: d.key,
            componentId: d.componentId,
            name: d.name,
            propValues: d.propValues,
          }))
        );
        setComposerStudio((prev) =>
          prev
            ? {
                ...prev,
                initialSignature: beaconCompositionSignature(
                  draftToApply.map((d) => ({
                    key: d.key,
                    componentId: d.componentId,
                    name: d.name,
                    propValues: d.propValues,
                  }))
                ),
              }
            : null
        );
        const rows2 = await listInstancesInBeaconTarget(beacon.container);
        const c2 = await resolveBeaconEngineConfiguredComponentIds(beacon.container, rows2);
        const e2 = filterHydratedBeaconComponentsByComponentIds(rows2, c2);
        setComposerEngineRows(e2);
        setComposerEngineComposable(await listComposableMetaByInstanceKey(e2));
        setComposerSlotProps(await readBeaconEngineSlotPropsFile(beacon.container, e2.length));
        void webflow.notify({
          type: "Success",
          message: "Composition saved. Page script updated — publish for the live site.",
        });
      }
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
      const slotF = await readBeaconEngineSlotPropsFile(container, nextSelected.length);
      await writeBeaconEngineSlotPropsFile(container, slotF);
      setEngineListSlotFile(slotF);
      setEngineListCompositionStale(true);
      void refreshPageBeacons();

      const dataList = activeDataList;
      if (dataList != null) {
        try {
          const comp = await getBeaconListTargetComponentOrNull(dataList, container, listTargetDefinitionIdRef.current);
          if (comp == null) {
            const { component: created, definitionId } = await createBeaconListTargetComponent({
              dataList,
              listContainer: container,
            });
            listTargetDefinitionIdRef.current = definitionId;
            const registeredName = await created.getName();
            setListTargetPhase("synced");
            setListTargetRegisteredName(registeredName);
            if (activeBeaconKey != null) {
              listTargetReconcileCacheRef.current = {
                beaconKey: activeBeaconKey,
                dataList,
                phase: "synced",
                registeredName,
              };
            }
          }
          await placeBeaconListTargetOnCanvas(dataList, container, listTargetDefinitionIdRef.current);
          try {
            const list = await listBeaconListTargetInstancesOnPage(dataList, container, {
              preferredDefinitionId: listTargetDefinitionIdRef.current,
            });
            setListTargetOnCanvasCount(list.length);
          } catch {
            setListTargetOnCanvasCount(0);
          }
        } catch (e) {
          console.warn("[beacon] list target after add component:", e);
        }
      }
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
      setCreateFormOpen(true);
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
        await removeBeaconsWrapperIfNoBeaconTargetsOnPage();
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
      const removeIdx = selected.findIndex((p) => p.key === row.key);
      setSelected(nextSelected);
      await writeBeaconEngineConfiguredComponentIds(
        container,
        nextSelected.map((entry) => entry.componentId)
      );
      const f = await readBeaconEngineSlotPropsFile(container, selected.length);
      const nextSlots = removeIdx >= 0 ? f.slots.filter((_, j) => j !== removeIdx) : f.slots;
      const out: BeaconEngineSlotPropsFile = { v: 1, slots: nextSlots };
      await writeBeaconEngineSlotPropsFile(container, out);
      setEngineListSlotFile(out);
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
      const comp = await getBeaconListTargetComponentOrNull(activeDataList, listContainer, preferredId);
      if (comp == null) {
        void webflow.notify({ type: "Warning", message: LIST_TARGET_COMPONENT_NOT_FOUND_MESSAGE });
      } else {
        await removeAllBeaconListTargetInstancesOnPage(activeDataList, listContainer, {
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
        const list = await listBeaconListTargetInstancesOnPage(activeDataList, listContainer, {
          preferredDefinitionId: listTargetDefinitionIdRef.current,
        });
        setListTargetOnCanvasCount(list.length);
      } catch {
        setListTargetOnCanvasCount(0);
      }
      void refreshPageBeacons();
    } catch (err) {
      const message = formatDesignerError(err);
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
      const comp = await getBeaconListTargetComponentOrNull(activeDataList, listContainer, preferredId);
      if (comp == null) {
        void webflow.notify({ type: "Warning", message: LIST_TARGET_COMPONENT_NOT_FOUND_MESSAGE });
      } else {
        await removeAllBeaconListTargetInstancesOnPage(activeDataList, listContainer, {
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
      const message = formatDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setListTargetRemovePending(false);
      setListTargetRemoveBusyKind(null);
    }
  };

  return (
    <div className={beaconAppRouteSurfaceClass}>
      {/* /beacons route header. Global app bar is `Header` in the shell, not this strip. */}
      <div className="shrink-0 border-b border-border/50 bg-muted/20 dark:bg-muted/15" data-slot="beacons_route_header">
        <div className="mx-auto flex h-8 min-w-0 max-w-lg items-center gap-2 px-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="-ml-1 shrink-0 text-foreground"
            aria-label={CMS_SLOTS_BACK_BUTTON_ARIA_LABEL}
            onClick={() => void navigate("/home")}
          >
            <ChevronLeft aria-hidden className="size-4" strokeWidth={2.25} />
          </Button>
          <h2 className="min-w-0 truncate text-sm font-medium leading-none tracking-tight text-foreground">
            {CMS_SLOTS_FEATURE_NAME}
          </h2>
          <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-1.5">
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
          {isEngine ? (
            <div className="space-y-4" data-route="beacons-engine">
              {!picking && (
                <BeaconHomePanel
                  nameFieldId={nameFieldId}
                  beaconsWrapperInstalled={beaconsWrapperInstalled}
                  installPending={installPending}
                  onInstallWrapper={handleInstallWrapper}
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
                  listTargetPhase={listTargetPhase}
                  listTargetOnCanvasCount={listTargetOnCanvasCount}
                  onCreateListTarget={handleCreateListTarget}
                  onRequestRemoveListTarget={handleRequestRemoveListTarget}
                  onPlaceListTargetOnCanvas={handlePlaceListTargetOnCanvas}
                  listTargetCreatePending={listTargetCreatePending}
                  listTargetRemovePending={listTargetRemovePending}
                  listTargetPlaceOnCanvasPending={listTargetPlaceOnCanvasPending}
                  engineSlotProps={engineListSlotFile ?? { v: 1, slots: [] }}
                  onSetSlotExposed={handleSetEngineSlotExposed}
                  onResyncEngineSlotAttrs={handleResyncEngineSlotAttrs}
                  resyncingEngineSlotKey={resyncingEngineSlotKey}
                />
              )}
            </div>
          ) : isComposer ? (
            <div className="space-y-4" data-route="beacons-composer">
              {composerStudio == null ? (
                <BeaconComposerListPanel
                  pageScanLoading={pageScanLoading}
                  beaconsWrapperInstalled={beaconsWrapperInstalled}
                  installPending={installPending}
                  onInstallWrapper={handleInstallWrapper}
                  loading={composerEligibleLoading}
                  runtimeOk={composerRuntimeOk && syncShellOk}
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
                  embedSyncPending={embedSyncPending}
                  onSyncInstallEmbed={handleSyncInstallEmbed}
                  rowMeta={composerRowMeta}
                  onChangePropValue={handleComposerSetPropValue}
                  onRenameSlot={handleComposerRenameSlotRow}
                />
              )}
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <AlertDialog open={beaconToDelete != null} onOpenChange={(o) => !o && setBeaconToDelete(null)}>
        <AlertDialogContent size="default">
          <AlertDialogHeader>
            <AlertDialogTitle>{CMS_SLOTS_DELETE_DIALOG_TITLE}</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          {isLastBeaconOnPageForDelete ? (
            <div
              className="flex max-w-sm gap-2.5 rounded-sm border border-border/70 bg-muted/25 p-2.5 sm:max-w-none"
              data-slot="beacon_delete_uninstall_page"
            >
              <Checkbox
                id={lastBeaconUninstallChoiceId}
                checked={uninstallWithLastBeaconDelete}
                disabled={deletePendingKey != null}
                onCheckedChange={(v) => setUninstallWithLastBeaconDelete(v === true)}
              />
              <div className="min-w-0">
                <Label htmlFor={lastBeaconUninstallChoiceId}>{CMS_SLOTS_UNINSTALL_PAGE_LABEL}</Label>
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
            setListTargetRemoveBusyKind(null);
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
            <AlertDialogCancel type="button" disabled={listTargetRemovePending}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              disabled={listTargetRemovePending}
              onClick={() => void handleRemoveListTargetFromCanvasOnly()}
            >
              {listTargetRemovePending && listTargetRemoveBusyKind === "canvas" ? "Removing…" : "Remove from canvas"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={listTargetRemovePending}
              onClick={() => void handleConfirmDeleteListTargetCompletely()}
            >
              {listTargetRemovePending && listTargetRemoveBusyKind === "delete" ? "Deleting…" : "Delete target"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <footer
        data-slot="beacons_dock"
        className="flex shrink-0 items-stretch gap-2 border-t border-border/65 bg-background px-3 pt-2 pb-[max(env(safe-area-inset-bottom,0px),0.375rem)]"
      >
        <nav className="flex min-w-0 flex-1 items-stretch gap-1.5" aria-label={CMS_SLOTS_AREA_NAV_LABEL}>
          <NavLink
            to="/beacons/engine"
            className={({ isActive }) =>
              cn(
                buttonVariants({
                  variant: isActive ? "beaconsDockNavActive" : "beaconsDockNav",
                  size: "dockNav",
                }),
                "min-w-0 flex-1 shrink"
              )
            }
            onClick={() => {
              if (composerStudio != null) {
                handleComposerStudioBack();
              }
            }}
          >
            <PanelsTopLeft aria-hidden />
            Engine
          </NavLink>
          <NavLink
            to="/beacons/composer"
            className={({ isActive }) =>
              cn(
                buttonVariants({
                  variant: isActive ? "beaconsDockNavActive" : "beaconsDockNav",
                  size: "dockNav",
                }),
                "min-w-0 flex-1 shrink"
              )
            }
            onClick={() => {
              if (picking) {
                exitToList();
              }
            }}
          >
            <List aria-hidden />
            Composer
          </NavLink>
        </nav>
        <Button
          type="button"
          variant="secondary"
          size="dockNav"
          disabled={embedSyncPending || pageRuntimeStatusLoading || !beaconsWrapperInstalled || pageScanLoading}
          aria-busy={embedSyncPending}
          title={
            !beaconsWrapperInstalled
              ? CMS_SLOTS_SYNC_REQUIRES_INSTALL_TOOLTIP
              : pageRuntimeStatusLoading
                ? "Checking page script…"
                : undefined
          }
          onClick={() => void handleSyncInstallEmbed()}
        >
          <SquareCode aria-hidden />
          Sync
        </Button>
      </footer>
    </div>
  );
}
