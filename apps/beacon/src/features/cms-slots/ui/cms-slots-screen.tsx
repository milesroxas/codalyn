import {
  type MutableRefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useRegisterRouteLeaveGuard } from "@/app/beacon-route-leave-guard";
import { ensureListTargetAfterAppendingSlotRow } from "@/features/cms-slots/model/append-slot-list-component-flow";
import { clearCmsSlotComponentDefCache } from "@/features/cms-slots/model/cms-slot-component-def-cache";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  hasUnconstrainedExposedImageProps,
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
  displayLabelForCmsSlotList,
  displayLabelForDataList,
} from "@/features/cms-slots/model/cms-slot-data-list-display";
import { stripDesignerCodalynAttrsFromComponentInstance } from "@/features/cms-slots/model/cms-slot-designer-codalyn-attr-sync";
import { renamePublishedSlotDisplayNameAtPoolIndex } from "@/features/cms-slots/model/cms-slot-designer-rename-published-slot";
import {
  type CmsSlotDesignerSlotPropsFile,
  inheritExposedFromExistingSeed,
  readCmsSlotDesignerSlotPropsFile,
  writeCmsSlotDesignerSlotPropsFile,
} from "@/features/cms-slots/model/cms-slot-designer-slot-props";
import { readCmsSlotListRuntimePayloadText } from "@/features/cms-slots/model/cms-slot-list-cms-composition-save";
import {
  parseCmsSlotListRuntimePayload,
  publishedDisplayNamesForDesignerPool,
} from "@/features/cms-slots/model/cms-slot-list-runtime-payload";
import type { CmsSlotListCmsTextFieldEnsureResult } from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import {
  ensureCmsSlotListCmsTextFieldOnList,
  getCmsSlotListTargetCmsFieldIdFromListContainer,
  resolveCmsSlotListTargetCmsCollectionIdForCleanup,
  verifyCmsSlotListTargetPlainTextField,
} from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import {
  countCmsSlotListTargetInstancesOnPageByName,
  isCmsSlotListTargetInstanceSelected,
  listCmsSlotListTargetInstancesOnPage,
  removeAllCmsSlotListTargetInstancesOnPage,
} from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";
import {
  type CmsSlotPageRuntimeSyncStatus,
  getCmsSlotPageRuntimeSyncStatus,
} from "@/features/cms-slots/model/cms-slot-page-inline-script";
import {
  type CmsSlotListOnPage,
  cmsSlotListKey,
  designerPoolIndexForRuntimeCloneIndex,
  filterHydratedCmsSlotRowsByPoolKeys,
  findCmsSlotListsOnPage,
  type HydratedCmsSlotRow,
  listInstancesInSlotListContainer,
  resolveCmsSlotDesignerConfiguredPoolKeys,
  writeCmsSlotDesignerConfiguredPoolKeys,
} from "@/features/cms-slots/model/cms-slot-page-targets";
import { resolveAllowedCmsSlotsSegment } from "@/features/cms-slots/model/cms-slots-access";
import {
  readCmsSlotsPageInstallInitialState,
  writeCmsSlotsPageInstallCache,
} from "@/features/cms-slots/model/cms-slots-page-install-cache";
import { loadComposerSynchronizedState } from "@/features/cms-slots/model/composer-sync";
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
  resolveCmsSlotsDeleteBeaconNotify,
  syncCmsSlotsInstallEmbedOnPage,
  uninstallCmsSlotsPageInstall,
} from "@/features/cms-slots/model/install-cms-slots-wrapper";
import { paletteForConfiguredPoolKeys } from "@/features/cms-slots/model/palette-for-configured-component-ids";
import {
  focusCmsSlotListTargetOnCanvas,
  placeCmsSlotListTargetOnCanvas,
} from "@/features/cms-slots/model/place-cms-slot-list-target-on-canvas";
import { renameCmsSlotListOnPage } from "@/features/cms-slots/model/rename-cms-slot-list-on-page";
import { resyncDesignerSlotPropAttributesForSlotIndex } from "@/features/cms-slots/model/resync-designer-slot-prop-attrs";
import { retryCmsSlotListTargetCmsFieldLink } from "@/features/cms-slots/model/retry-cms-slot-list-target-cms-field-link";
import {
  appendComponentToSlotListContainer,
  type CmsSlotCompositionDraftRow,
  type CmsSlotPaletteEntry,
  copySeedPropOverrides,
  deleteCmsSlotListAndListTargetDefinition,
  listSiteComponentsForPicker,
  removeComponentInstanceFromCanvas,
  setSeedInstanceVariant,
} from "@/features/cms-slots/model/site-components";
import { useCmsComposerEditingContextState } from "@/features/cms-slots/model/use-cms-composer-editing-context-state";
import { useCmsSlotsAccess } from "@/features/cms-slots/model/use-cms-slots-access";
import { useListTargetCmsFieldLinkStatus } from "@/features/cms-slots/model/use-list-target-cms-field-link-status";
import type { CmsSlotsCmsFieldLinkDialogVariant } from "@/features/cms-slots/ui/cms-slots-cms-field-link-dialog";
import { CmsSlotsRouteChrome } from "@/features/cms-slots/ui/cms-slots-route-chrome";
import {
  CMS_SLOTS_CMS_FIELD_LINK_TOAST_SUCCESS,
  CMS_SLOTS_CMS_FIELD_NOT_VISIBLE_NOTIFY,
  CMS_SLOTS_DESIGNER_LIST_CHANGED_SYNC_REASON,
  CMS_SLOTS_PUBLISH_TO_APPLY_HINT,
  CMS_SLOTS_ROUTE_TASK_ADDING_COMPONENT,
  CMS_SLOTS_ROUTE_TASK_CHECKING_INSTALL,
  CMS_SLOTS_ROUTE_TASK_CREATING_LIST,
  CMS_SLOTS_ROUTE_TASK_CREATING_LIST_TARGET,
  CMS_SLOTS_ROUTE_TASK_FINISHING,
  CMS_SLOTS_ROUTE_TASK_FOCUSING_ON_CANVAS,
  CMS_SLOTS_ROUTE_TASK_PLACING_ON_CANVAS,
  CMS_SLOTS_ROUTE_TASK_RENAMING_LIST,
  CMS_SLOTS_ROUTE_TASK_SAVING_COMPOSITION,
  CMS_SLOTS_ROUTE_TASK_SAVING_SLOT_CONFIG,
  CMS_SLOTS_ROUTE_TASK_TAGGING_DATA_ATTRIBUTES,
  CMS_SLOTS_TOAST_LIST_CREATED,
  CMS_SLOTS_TOAST_LIST_RENAMED,
  CMS_SLOTS_TOAST_LIST_TARGET_FOCUSED,
  CMS_SLOTS_TOAST_LIST_TARGET_NOT_ON_CANVAS,
} from "@/shared/lib/cms-slots-feature-copy";
import { useDesignerViewReturnDetect } from "@/shared/lib/use-designer-view-return-detect";
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
function parseCmsSlotsRouteSegment(pathname: string, locationHash: string): "designer" | "composer" | null {
  for (const raw of [pathname, locationHash.replace(/^#/, "")].filter(Boolean)) {
    const p = raw.startsWith("/") ? raw : `/${raw}`;
    const m = /^\/(?:cms-slots|beacons)\/(designer|composer)\/?$/.exec(p);
    if (m != null) {
      return m[1] as "designer" | "composer";
    }
  }
  return null;
}

function useCmsSlotsInvalidSegmentRedirect(
  segmentFromPath: "designer" | "composer" | null,
  routePathname: string,
  routeHash: string,
  defaultSegment: "designer" | "composer",
  navigate: (to: string, options?: { replace?: boolean }) => void
) {
  useEffect(() => {
    if (segmentFromPath != null) return;
    for (const raw of [routePathname, routeHash.replace(/^#/, "")].filter(Boolean)) {
      const p = raw.startsWith("/") ? raw : `/${raw}`;
      const m = /^\/(?:cms-slots|beacons)\/([^/]+)\/?$/.exec(p);
      if (m != null && m[1] !== "designer" && m[1] !== "composer") {
        void navigate(`/cms-slots/${defaultSegment}`, { replace: true });
        return;
      }
    }
  }, [segmentFromPath, routePathname, routeHash, defaultSegment, navigate]);
}

type BeaconsPageChangeReset = {
  setPicking: (v: boolean) => void;
  setCreateFormOpen: (v: boolean) => void;
  setActiveDataList: (v: string | null) => void;
  setSelected: (v: HydratedCmsSlotRow[]) => void;
  setActiveComposer: (v: { beacon: CmsSlotListOnPage; initialSignature: string } | null) => void;
  setComposerDraft: (v: CmsSlotCompositionDraftRow[]) => void;
  setComposerAllowedPalette: (v: CmsSlotPaletteEntry[]) => void;
  setComposerDesignerRows: (v: HydratedCmsSlotRow[]) => void;
  setComposerDesignerComposable: (v: Record<string, ComposableInstancePropMeta[]>) => void;
  setComposerSlotProps: (v: CmsSlotDesignerSlotPropsFile | null) => void;
  setDesignerListSlotFile: (v: CmsSlotDesignerSlotPropsFile | null) => void;
  setComposerOpeningKey: (v: string | null) => void;
  setBeaconName: (v: string) => void;
  setListTargetCreatePending: (v: boolean) => void;
  setListTargetRemovePending: (v: boolean) => void;
  setListTargetRemoveBusyKind: (v: "canvas" | "delete" | null) => void;
  setListTargetPlaceOnCanvasPending: (v: boolean) => void;
  setListTargetPhase: (v: CmsSlotListTargetPhase) => void;
  setListTargetRegisteredName: (v: string | null) => void;
  setListTargetOnCanvasCount: (v: number) => void;
  setListTargetOnCanvasCountResolved: (v: boolean) => void;
  setRemoveListTargetDialogOpen: (v: boolean) => void;
  setActiveBeaconKey: (v: string | null) => void;
  setDesignerListCompositionStale: (v: boolean) => void;
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
        void navigate("/cms-slots/designer", { replace: true });
        reset.setActiveComposer(null);
        reset.setComposerDraft([]);
        reset.setComposerAllowedPalette([]);
        reset.setComposerDesignerRows([]);
        reset.setComposerDesignerComposable({});
        reset.setComposerSlotProps(null);
        reset.setDesignerListSlotFile(null);
        reset.setComposerOpeningKey(null);
        reset.setBeaconName("");
        reset.setListTargetCreatePending(false);
        reset.setListTargetRemovePending(false);
        reset.setListTargetRemoveBusyKind(null);
        reset.setListTargetPlaceOnCanvasPending(false);
        reset.setListTargetPhase("loading");
        reset.setListTargetRegisteredName(null);
        reset.setListTargetOnCanvasCount(0);
        reset.setListTargetOnCanvasCountResolved(false);
        reset.setRemoveListTargetDialogOpen(false);
        reset.setActiveBeaconKey(null);
        reset.listTargetResolveGen.current += 1;
        reset.listTargetReconcileCacheRef.current = null;
        reset.listTargetDefinitionIdRef.current = null;
        reset.setDesignerListCompositionStale(false);
        void refreshPageBeacons();
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
  designerListCompositionStale: boolean
) {
  return useMemo((): { syncShellOk: boolean; syncShellReason: string | undefined } => {
    if (!pageRuntimeSynced) {
      return { syncShellOk: false, syncShellReason: pageRuntimeSyncReason };
    }
    if (designerListCompositionStale) {
      return {
        syncShellOk: false,
        syncShellReason: CMS_SLOTS_DESIGNER_LIST_CHANGED_SYNC_REASON,
      };
    }
    return { syncShellOk: true, syncShellReason: undefined };
  }, [pageRuntimeSynced, pageRuntimeSyncReason, designerListCompositionStale]);
}

type LoadComposerEligibleOptions = {
  rescanLists?: boolean;
  refreshRuntime?: boolean;
  runtime?: CmsSlotPageRuntimeSyncStatus;
};

async function refreshComposerEligibleLists(args: {
  pageBeacons: CmsSlotListOnPage[];
  opts?: LoadComposerEligibleOptions;
  pageRuntimeSyncedRef: MutableRefObject<boolean>;
  pageRuntimeSyncReasonRef: MutableRefObject<string | undefined>;
  applyPageRuntimeSyncStatus: (runtime: CmsSlotPageRuntimeSyncStatus) => void;
  setPageBeacons: (beacons: CmsSlotListOnPage[]) => void;
  setComposerEligible: (eligible: CmsSlotListOnPage[]) => void;
  setComposerRuntimeOk: (runtimeOk: boolean) => void;
}): Promise<void> {
  const {
    pageBeacons,
    opts,
    pageRuntimeSyncedRef,
    pageRuntimeSyncReasonRef,
    applyPageRuntimeSyncStatus,
    setPageBeacons,
    setComposerEligible,
    setComposerRuntimeOk,
  } = args;

  try {
    let beacons = pageBeacons;
    if (opts?.rescanLists) {
      beacons = await findCmsSlotListsOnPage();
      setPageBeacons(beacons);
    }

    let runtime: CmsSlotPageRuntimeSyncStatus | undefined = opts?.runtime;
    if (runtime == null) {
      runtime = opts?.refreshRuntime
        ? await getCmsSlotPageRuntimeSyncStatus()
        : {
            synced: pageRuntimeSyncedRef.current,
            reason: pageRuntimeSyncReasonRef.current,
          };
    }
    if (opts?.refreshRuntime || opts?.runtime != null) {
      applyPageRuntimeSyncStatus(runtime);
    }

    const r = await listComposerEligibleLists(beacons, runtime);
    setComposerEligible(r.eligible);
    setComposerRuntimeOk(r.runtimeOk);
  } catch {
    setComposerEligible([]);
    setComposerRuntimeOk(false);
    const runtime = await getCmsSlotPageRuntimeSyncStatus();
    applyPageRuntimeSyncStatus(runtime);
  }
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

function useListTargetSelectedOnCanvas(
  picking: boolean,
  listTargetPhase: CmsSlotListTargetPhase,
  listTargetOnCanvasCount: number,
  listTargetOnCanvasCountResolved: boolean,
  activeDataList: string | null,
  targetRef: MutableRefObject<BlockElement | null>,
  listTargetDefinitionIdRef: MutableRefObject<string | null>
) {
  const [listTargetSelectedOnCanvas, setListTargetSelectedOnCanvas] = useState(false);

  const refreshListTargetSelectedOnCanvas = useCallback(async () => {
    if (
      !picking ||
      listTargetPhase !== "synced" ||
      !listTargetOnCanvasCountResolved ||
      listTargetOnCanvasCount === 0 ||
      activeDataList == null
    ) {
      setListTargetSelectedOnCanvas(false);
      return;
    }
    const listContainer = targetRef.current;
    if (listContainer == null) {
      setListTargetSelectedOnCanvas(false);
      return;
    }
    try {
      const selected = await isCmsSlotListTargetInstanceSelected(activeDataList, listContainer, {
        preferredDefinitionId: listTargetDefinitionIdRef.current,
      });
      setListTargetSelectedOnCanvas(selected);
    } catch {
      setListTargetSelectedOnCanvas(false);
    }
  }, [
    picking,
    listTargetPhase,
    listTargetOnCanvasCountResolved,
    listTargetOnCanvasCount,
    activeDataList,
    targetRef,
    listTargetDefinitionIdRef,
  ]);

  useEffect(() => {
    void refreshListTargetSelectedOnCanvas();
  }, [refreshListTargetSelectedOnCanvas]);

  useEffect(() => {
    if (!picking || listTargetPhase !== "synced" || listTargetOnCanvasCount === 0) {
      return;
    }
    const unsub = webflow.subscribe("selectedelement", () => {
      void refreshListTargetSelectedOnCanvas();
    });
    return unsub;
  }, [picking, listTargetPhase, listTargetOnCanvasCount, refreshListTargetSelectedOnCanvas]);

  return listTargetSelectedOnCanvas;
}

function useListTargetOnCanvasCountWhenSynced(
  picking: boolean,
  listTargetPhase: CmsSlotListTargetPhase,
  activeDataList: string | null,
  activeBeaconKey: string | null,
  targetRef: MutableRefObject<BlockElement | null>,
  listTargetDefinitionIdRef: MutableRefObject<string | null>,
  setListTargetOnCanvasCount: (n: number) => void,
  setListTargetOnCanvasCountResolved: (resolved: boolean) => void
) {
  useEffect(() => {
    if (!picking || listTargetPhase !== "synced" || activeDataList == null || activeBeaconKey == null) {
      setListTargetOnCanvasCount(0);
      setListTargetOnCanvasCountResolved(false);
      return;
    }
    const listContainer = targetRef.current;
    if (listContainer == null) {
      setListTargetOnCanvasCount(0);
      setListTargetOnCanvasCountResolved(false);
      return;
    }
    let cancelled = false;
    setListTargetOnCanvasCountResolved(false);
    void (async () => {
      try {
        // Identity-only count (no enterComponent/exitComponent surface check): the surface check leaves the entered
        // instance selected, which would falsely flip the "Select on canvas" button to "Selected" on open. A
        // presence gate only needs identity. See countCmsSlotListTargetInstancesOnPageByName.
        const count = await countCmsSlotListTargetInstancesOnPageByName(activeDataList, listContainer, {
          preferredDefinitionId: listTargetDefinitionIdRef.current,
        });
        if (!cancelled) {
          setListTargetOnCanvasCount(count);
          setListTargetOnCanvasCountResolved(true);
        }
      } catch {
        if (!cancelled) {
          setListTargetOnCanvasCount(0);
          setListTargetOnCanvasCountResolved(true);
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
    setListTargetOnCanvasCountResolved,
  ]);
}

function isListTargetCanvasActionBlocked(
  listTargetFocusOnCanvasPending: boolean,
  listTargetPlaceOnCanvasPending: boolean,
  listTargetCreatePending: boolean,
  listTargetRemovePending: boolean,
  listTargetPhase: CmsSlotListTargetPhase,
  listTargetOnCanvasCountResolved: boolean,
  activeDataList: string | null
): boolean {
  return (
    listTargetFocusOnCanvasPending ||
    listTargetPlaceOnCanvasPending ||
    listTargetCreatePending ||
    listTargetRemovePending ||
    listTargetPhase !== "synced" ||
    !listTargetOnCanvasCountResolved ||
    activeDataList == null
  );
}

async function refreshListTargetOnCanvasCount(
  dataList: string,
  listContainer: BlockElement,
  preferredDefinitionId: string | null,
  setListTargetOnCanvasCount: (n: number) => void,
  setListTargetOnCanvasCountResolved: (resolved: boolean) => void
): Promise<void> {
  try {
    const list = await listCmsSlotListTargetInstancesOnPage(dataList, listContainer, {
      preferredDefinitionId,
    });
    setListTargetOnCanvasCount(list.length);
  } catch {
    setListTargetOnCanvasCount(0);
  } finally {
    setListTargetOnCanvasCountResolved(true);
  }
}

/**
 * After deleting a CMS slot list, rewrite the page runtime script so the user doesn't have to press Sync manually.
 * Reachable only from the designer route's delete (the composer exposes none). Skipped when the page was just
 * uninstalled — the wrapper is gone, so `syncCmsSlotsInstallEmbedOnPage` would throw and there is nothing left to
 * sync. On sync failure, leave the Sync button emphasized so the user can retry manually.
 */
async function autoSyncPageRuntimeAfterSlotDelete(args: {
  shouldUninstallPage: boolean;
  setDesignerListCompositionStale: (v: boolean) => void;
}): Promise<void> {
  const { shouldUninstallPage, setDesignerListCompositionStale } = args;
  if (shouldUninstallPage) {
    setDesignerListCompositionStale(true);
    return;
  }
  try {
    await syncCmsSlotsInstallEmbedOnPage();
    setDesignerListCompositionStale(false);
  } catch (syncErr) {
    setDesignerListCompositionStale(true);
    console.warn("[beacon] auto-sync after slot delete (non-fatal):", syncErr);
  }
}

async function promptCmsFieldLinkWhenVerified(
  ensure: CmsSlotListCmsTextFieldEnsureResult | null | undefined,
  openCmsFieldLinkPrompt: (binding: { collectionId: string; fieldId: string }) => void
): Promise<void> {
  if (!ensure?.fieldWasCreated) {
    return;
  }
  if (!(await verifyCmsSlotListTargetPlainTextField(ensure.binding))) {
    void webflow.notify({ type: "Warning", message: CMS_SLOTS_CMS_FIELD_NOT_VISIBLE_NOTIFY });
    return;
  }
  void openCmsFieldLinkPrompt(ensure.binding);
}

async function finishListTargetCanvasPlacement(params: {
  instance: ComponentElement;
  alreadyExisted: boolean;
  cmsFieldWasCreated: boolean;
  activeDataList: string;
  listContainer: BlockElement;
  preferredDefinitionId: string | null;
  openCmsFieldLinkPrompt: (binding: { collectionId: string; fieldId: string }) => void;
  setListTargetOnCanvasCount: (n: number) => void;
  setListTargetOnCanvasCountResolved: (resolved: boolean) => void;
}): Promise<void> {
  if (params.cmsFieldWasCreated) {
    const collectionId = await resolveCmsSlotListTargetCmsCollectionIdForCleanup(params.listContainer);
    const fieldId = await getCmsSlotListTargetCmsFieldIdFromListContainer(params.listContainer);
    if (collectionId != null && fieldId != null) {
      await promptCmsFieldLinkWhenVerified(
        { binding: { collectionId, fieldId }, fieldWasCreated: true },
        params.openCmsFieldLinkPrompt
      );
    }
  }
  try {
    await webflow.setSelectedElement(params.instance);
  } catch {
    /* selection is optional */
  }
  await refreshListTargetOnCanvasCount(
    params.activeDataList,
    params.listContainer,
    params.preferredDefinitionId,
    params.setListTargetOnCanvasCount,
    params.setListTargetOnCanvasCountResolved
  );
  void webflow.notify({
    type: "Success",
    message: params.alreadyExisted ? CMS_SLOTS_TOAST_LIST_TARGET_FOCUSED : "List target placed on the canvas.",
  });
}

export function CmsSlotsScreen() {
  const nameFieldId = useId();
  const searchFieldId = useId();
  const lastBeaconUninstallChoiceId = useId();
  const { editorExperience, canAccessDesigner, defaultSegment } = useCmsSlotsAccess();
  const { segment: segmentParam } = useParams();
  const { pathname: routePathname, hash: routeHash } = useLocation();
  const segmentFromPath = parseCmsSlotsRouteSegment(routePathname, routeHash);
  /** Matched route param is authoritative; fall back to parsed path for older/wrapper edge cases. */
  const segment: "designer" | "composer" =
    segmentParam === "designer" || segmentParam === "composer"
      ? resolveAllowedCmsSlotsSegment(segmentParam, editorExperience)
      : (segmentFromPath ?? defaultSegment);
  const navigate = useNavigate();
  const initialPageInstall = readCmsSlotsPageInstallInitialState();
  const [pageBeacons, setPageBeacons] = useState<CmsSlotListOnPage[]>(initialPageInstall.pageBeacons);
  const [pageScanLoading, setPageScanLoading] = useState(true);
  /** Full-route boot overlay only until the first page scan settles (not background refreshes). */
  const [pageBootBlocking, setPageBootBlocking] = useState(!initialPageInstall.routeStateKnown);
  const [routeStateKnown, setRouteStateKnown] = useState(initialPageInstall.routeStateKnown);
  const [beaconsWrapperInstalled, setBeaconsWrapperInstalled] = useState(initialPageInstall.beaconsWrapperInstalled);
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
  /** Fine-grained copy for multi-step Designer operations shown in the route overlay. */
  const [routeTaskPhase, setRouteTaskPhase] = useState<string | null>(null);
  const [slotPropsWritePending, setSlotPropsWritePending] = useState(false);
  /** Opens the expose/tag drawer on the row with this `key` once after add-from-catalog. */
  const [autoOpenExposeDrawerRowKey, setAutoOpenExposeDrawerRowKey] = useState<string | null>(null);
  /**
   * Key of a just-added seed that is staged but not yet committed to the slot list. Its instance + props sheet exist,
   * but pool keys / list target are deferred until the user clicks “Make editable” or picks a non-base variant.
   * Closing the sheet without committing discards it (instance removed). `null` when nothing is staged.
   */
  const [pendingSeedRowKey, setPendingSeedRowKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<HydratedCmsSlotRow[]>([]);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [settingVariantKey, setSettingVariantKey] = useState<string | null>(null);
  const [resyncingDesignerSlotKey, setResyncingDesignerSlotKey] = useState<string | null>(null);
  const [designerPublishedDisplayNames, setDesignerPublishedDisplayNames] = useState<string[] | null>(null);
  const [designerSlotLabelRefreshToken, setDesignerSlotLabelRefreshToken] = useState(0);
  const [renamingPublishedSlotKey, setRenamingPublishedSlotKey] = useState<string | null>(null);
  const [listTargetCreatePending, setListTargetCreatePending] = useState(false);
  const [listTargetRemovePending, setListTargetRemovePending] = useState(false);
  const [listTargetRemoveBusyKind, setListTargetRemoveBusyKind] = useState<"canvas" | "delete" | null>(null);
  const [listTargetPlaceOnCanvasPending, setListTargetPlaceOnCanvasPending] = useState(false);
  const [listTargetFocusOnCanvasPending, setListTargetFocusOnCanvasPending] = useState(false);
  const [listTargetPhase, setListTargetPhase] = useState<CmsSlotListTargetPhase>("loading");
  const [, setListTargetRegisteredName] = useState<string | null>(null);
  const [listTargetOnCanvasCount, setListTargetOnCanvasCount] = useState(0);
  const [listTargetOnCanvasCountResolved, setListTargetOnCanvasCountResolved] = useState(false);
  const [removeListTargetDialogOpen, setRemoveListTargetDialogOpen] = useState(false);
  const [cmsFieldLinkPromptOpen, setCmsFieldLinkPromptOpen] = useState(false);
  const [cmsFieldLinkPromptVariant, setCmsFieldLinkPromptVariant] =
    useState<CmsSlotsCmsFieldLinkDialogVariant>("post-create");
  const cmsFieldLinkPromptVariantRef = useRef<CmsSlotsCmsFieldLinkDialogVariant>("post-create");
  const cmsFieldLinkDismissedBeaconKeyRef = useRef<string | null>(null);
  const [cmsFieldLinkDetectEpoch, setCmsFieldLinkDetectEpoch] = useState(0);
  const [cmsFieldLinkRetryPending, setCmsFieldLinkRetryPending] = useState(false);
  const cmsFieldLinkBindingRef = useRef<{ collectionId: string; fieldId: string } | null>(null);
  const cmsFieldLinkNavReady = useDesignerViewReturnDetect(cmsFieldLinkPromptOpen, cmsFieldLinkDetectEpoch);
  const [activeBeaconKey, setActiveBeaconKey] = useState<string | null>(null);
  const listTargetResolveGen = useRef(0);
  /** Last known list target registration for a beacon; avoids re-querying Webflow on repeat opens. */
  const listTargetReconcileCacheRef = useRef<ListTargetReconcileCacheEntry | null>(null);
  const [openingBeaconKey, setOpeningBeaconKey] = useState<string | null>(null);
  const [beaconToDelete, setBeaconToDelete] = useState<CmsSlotListOnPage | null>(null);
  const [uninstallWithLastBeaconDelete, setUninstallWithLastBeaconDelete] = useState(false);
  const [deletePendingKey, setDeletePendingKey] = useState<string | null>(null);
  const [renamePendingKey, setRenamePendingKey] = useState<string | null>(null);
  const [embedSyncPending, setEmbedSyncPending] = useState(false);
  const [pageRuntimeStatusLoading, setPageRuntimeStatusLoading] = useState(true);
  const [pageRuntimeSynced, setPageRuntimeSynced] = useState(false);
  const [pageRuntimeSyncReason, setPageRuntimeSyncReason] = useState<string | undefined>(undefined);
  const pageRuntimeSyncedRef = useRef(pageRuntimeSynced);
  pageRuntimeSyncedRef.current = pageRuntimeSynced;
  const pageRuntimeSyncReasonRef = useRef(pageRuntimeSyncReason);
  pageRuntimeSyncReasonRef.current = pageRuntimeSyncReason;
  /**
   * True when Designer slot composition metadata changed before canvas attrs / footer script reflect it.
   * Cleared after a successful “Make editable” apply or footer Sync.
   */
  const [designerListCompositionStale, setDesignerListCompositionStale] = useState(false);

  const isDesigner = segment === "designer";
  const isComposer = segment === "composer";
  const [composerEligibleLoading, setComposerEligibleLoading] = useState(false);
  const [composerEligibleResolved, setComposerEligibleResolved] = useState(false);
  const [composerEligible, setComposerEligible] = useState<CmsSlotListOnPage[]>([]);
  const [composerRuntimeOk, setComposerRuntimeOk] = useState(false);
  const [activeComposer, setActiveComposer] = useState<{ beacon: CmsSlotListOnPage; initialSignature: string } | null>(
    null
  );
  const [composerDraft, setComposerDraft] = useState<CmsSlotCompositionDraftRow[]>([]);
  const [composerDesignerRows, setComposerDesignerRows] = useState<HydratedCmsSlotRow[]>([]);
  const [composerDesignerComposable, setComposerDesignerComposable] = useState<
    Record<string, ComposableInstancePropMeta[]>
  >({});
  const [composerSlotProps, setComposerSlotProps] = useState<CmsSlotDesignerSlotPropsFile | null>(null);
  const [composerAllowedPalette, setComposerAllowedPalette] = useState<CmsSlotPaletteEntry[]>([]);
  const [composerOpeningKey, setComposerOpeningKey] = useState<string | null>(null);
  const [designerListSlotFile, setDesignerListSlotFile] = useState<CmsSlotDesignerSlotPropsFile | null>(null);
  const [composerSavePending, setComposerSavePending] = useState(false);
  const [composerLeaveDialogOpen, setComposerLeaveDialogOpen] = useState(false);
  // "external" routes the confirmed leave to a navigation owned outside this screen (e.g. the header back
  // button), which is stashed in `pendingExternalLeaveRef` and run after the user saves or discards.
  type ComposerLeaveDestination = "composer-list" | "designer" | "external";
  const composerLeaveDestinationRef = useRef<ComposerLeaveDestination>("composer-list");
  const pendingExternalLeaveRef = useRef<(() => void) | null>(null);
  const [currentCmsItemId, setCurrentCmsItemId] = useState<string | null>(null);
  const composerEditingContext = useCmsComposerEditingContextState({
    enabled: isComposer || isDesigner,
    currentCmsItemId,
  });
  const activeComposerRef = useRef<{
    beacon: CmsSlotListOnPage;
    initialSignature: string;
  } | null>(null);
  activeComposerRef.current = activeComposer;

  const composerEligibleResolvedRef = useRef(composerEligibleResolved);
  composerEligibleResolvedRef.current = composerEligibleResolved;

  /** Latest designer rows — avoids stale closures inside queued slot-prop writes. */
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  /** Latest staged-seed key — read inside async commit handlers without a stale closure. */
  const pendingSeedRowKeyRef = useRef(pendingSeedRowKey);
  pendingSeedRowKeyRef.current = pendingSeedRowKey;

  /** Stable handle to the latest staged-seed commit — lets the memoized resync handler commit without a dep on it. */
  const commitPendingSeedRowRef = useRef<() => Promise<void>>(() => Promise.resolve());

  /** Latest “composition stale” value — discarding a staged seed restores it (the net change is zero). */
  const designerListCompositionStaleRef = useRef(designerListCompositionStale);
  designerListCompositionStaleRef.current = designerListCompositionStale;

  /**
   * Serializes `data-beacon-designer-slot-props` writes so “Make editable” reads the same exposed props the UI
   * just persisted (no read-before-write race on rapid checkbox + apply).
   */
  const slotPropsWriteTailRef = useRef(Promise.resolve<void>(undefined));
  const withSlotPropsWriteExclusive = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    const prev = slotPropsWriteTailRef.current;
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    slotPropsWriteTailRef.current = gate;
    await prev;
    setSlotPropsWritePending(true);
    try {
      return await fn();
    } finally {
      setSlotPropsWritePending(false);
      release();
    }
  }, []);

  const awaitSlotPropsWritesIdle = useCallback(async () => {
    await slotPropsWriteTailRef.current;
  }, []);

  const applyPageRuntimeSyncStatus = useCallback((runtime: CmsSlotPageRuntimeSyncStatus) => {
    setPageRuntimeSynced(runtime.synced);
    setPageRuntimeSyncReason(runtime.reason);
  }, []);

  const fetchPageBeaconsAndRuntime = useCallback(async (): Promise<CmsSlotPageRuntimeSyncStatus> => {
    setPageScanLoading(true);
    setPageRuntimeStatusLoading(true);
    const runtimePromise = getCmsSlotPageRuntimeSyncStatus().then((runtime) => {
      applyPageRuntimeSyncStatus(runtime);
      return runtime;
    });

    try {
      const [found, installed] = await Promise.all([findCmsSlotListsOnPage(), isCmsSlotsWrapperInstalledOnPage()]);
      setPageBeacons(found);
      setBeaconsWrapperInstalled(installed);
      try {
        const page = await webflow.getCurrentPage();
        writeCmsSlotsPageInstallCache({
          pageId: String(page.id),
          pageBeacons: found,
          beaconsWrapperInstalled: installed,
        });
      } catch {
        /* cache write is best-effort */
      }
    } catch {
      setPageBeacons([]);
      setBeaconsWrapperInstalled(false);
    } finally {
      setPageScanLoading(false);
      setRouteStateKnown(true);
      setPageBootBlocking(false);
    }

    try {
      return await runtimePromise;
    } finally {
      setPageRuntimeStatusLoading(false);
    }
  }, [applyPageRuntimeSyncStatus]);

  const refreshPageBeacons = useCallback(async () => {
    await fetchPageBeaconsAndRuntime();
  }, [fetchPageBeaconsAndRuntime]);

  const loadComposerEligible = useCallback(
    async (opts?: LoadComposerEligibleOptions) => {
      const firstLoad = !composerEligibleResolvedRef.current;
      if (firstLoad) {
        setComposerEligibleLoading(true);
        setComposerEligibleResolved(false);
      }
      await refreshComposerEligibleLists({
        pageBeacons,
        opts,
        pageRuntimeSyncedRef,
        pageRuntimeSyncReasonRef,
        applyPageRuntimeSyncStatus,
        setPageBeacons,
        setComposerEligible,
        setComposerRuntimeOk,
      });
      if (firstLoad) {
        setComposerEligibleLoading(false);
        setComposerEligibleResolved(true);
      }
    },
    [applyPageRuntimeSyncStatus, pageBeacons]
  );

  const { syncShellOk, syncShellReason } = useBeaconSyncShellLabels(
    pageRuntimeSynced,
    pageRuntimeSyncReason,
    designerListCompositionStale
  );

  /** Page script sync only matters once the wrapper is installed and at least one CMS slot exists. */
  const pageRuntimeSyncRelevant = beaconsWrapperInstalled && pageBeacons.length > 0;

  useEffect(() => {
    void beaconToDelete;
    setUninstallWithLastBeaconDelete(false);
  }, [beaconToDelete]);

  const isLastCmsSlotListOnPageForDelete = useMemo(() => {
    if (beaconToDelete == null) return false;
    return pageBeacons.length === 1 && pageBeacons[0]?.key === beaconToDelete.key;
  }, [beaconToDelete, pageBeacons]);

  const activeListLabel = useMemo(() => {
    if (activeDataList == null) {
      return null;
    }
    const pageBeacon = pageBeacons.find((entry) => entry.dataList === activeDataList);
    if (pageBeacon != null) {
      return displayLabelForCmsSlotList(pageBeacon);
    }
    const composerBeacon = activeComposer?.beacon;
    if (composerBeacon != null && composerBeacon.dataList === activeDataList) {
      return displayLabelForCmsSlotList(composerBeacon);
    }
    return displayLabelForDataList(activeDataList);
  }, [activeDataList, activeComposer, pageBeacons]);

  useEffect(() => {
    void refreshPageBeacons();
  }, [refreshPageBeacons]);

  useCmsSlotsInvalidSegmentRedirect(segmentFromPath, routePathname, routeHash, defaultSegment, navigate);

  useEffect(() => {
    if (!canAccessDesigner && isDesigner) {
      void navigate("/cms-slots/composer", { replace: true });
    }
  }, [canAccessDesigner, isDesigner, navigate]);

  useEffect(() => {
    if (!isComposer || pageScanLoading || pageRuntimeStatusLoading) return;
    void loadComposerEligible();
  }, [isComposer, pageScanLoading, pageRuntimeStatusLoading, loadComposerEligible]);

  useLayoutEffect(() => {
    if (isComposer && !composerEligibleResolved && !composerEligibleLoading) {
      setComposerEligibleLoading(true);
    }
  }, [isComposer, composerEligibleResolved, composerEligibleLoading]);

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
    const openComposer = activeComposerRef.current;
    if (openComposer == null) {
      return undefined;
    }
    const beacon = openComposer.beacon;
    let cancelled = false;
    void (async () => {
      try {
        const result = await loadComposerSynchronizedState({
          slotList: beacon,
          currentCmsItemId,
          shouldAbort: () => cancelled,
        });
        if (result == null || cancelled) {
          return;
        }
        setComposerAllowedPalette(result.allowedPalette);
        setComposerDesignerRows(result.designerScopedRows);
        setComposerDesignerComposable(result.composerDesignerComposable);
        setComposerSlotProps(result.composerSlotProps);
        setComposerDraft(result.draft);
        setActiveComposer((prev) =>
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

  const beaconsPageChangeResetRef = useRef<BeaconsPageChangeReset | null>(null);
  beaconsPageChangeResetRef.current = {
    setPicking,
    setCreateFormOpen,
    setActiveDataList,
    setSelected,
    setActiveComposer,
    setComposerDraft,
    setComposerAllowedPalette,
    setComposerDesignerRows,
    setComposerDesignerComposable,
    setComposerSlotProps,
    setDesignerListSlotFile,
    setComposerOpeningKey,
    setBeaconName,
    setListTargetCreatePending,
    setListTargetRemovePending,
    setListTargetRemoveBusyKind,
    setListTargetPlaceOnCanvasPending,
    setListTargetPhase,
    setListTargetRegisteredName,
    setListTargetOnCanvasCount,
    setListTargetOnCanvasCountResolved,
    setRemoveListTargetDialogOpen,
    setActiveBeaconKey,
    setDesignerListCompositionStale,
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
    setAutoOpenExposeDrawerRowKey(null);
    setPendingSeedRowKey(null);
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
    setListTargetOnCanvasCountResolved(false);
    setRemoveListTargetDialogOpen(false);
    setCmsFieldLinkPromptOpen(false);
    cmsFieldLinkDismissedBeaconKeyRef.current = null;
    setActiveBeaconKey(null);
    setDesignerListSlotFile(null);
    setDesignerPublishedDisplayNames(null);
    setDesignerSlotLabelRefreshToken(0);
    setRenamingPublishedSlotKey(null);
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
    setListTargetOnCanvasCount,
    setListTargetOnCanvasCountResolved
  );
  const listTargetSelectedOnCanvas = useListTargetSelectedOnCanvas(
    picking,
    listTargetPhase,
    listTargetOnCanvasCount,
    listTargetOnCanvasCountResolved,
    activeDataList,
    targetRef,
    listTargetDefinitionIdRef
  );

  const storeUnlinkedCmsFieldBinding = useCallback((binding: { collectionId: string; fieldId: string }) => {
    cmsFieldLinkBindingRef.current = binding;
  }, []);

  const { listTargetCmsFieldUnlinked, listTargetCmsFieldLinkCheckPending, refreshListTargetCmsFieldLinkStatus } =
    useListTargetCmsFieldLinkStatus({
      picking,
      listTargetPhase,
      listTargetOnCanvasCount,
      listTargetOnCanvasCountResolved,
      activeDataList,
      activeBeaconKey,
      targetRef,
      listTargetDefinitionIdRef,
      onUnlinkedBinding: storeUnlinkedCmsFieldBinding,
    });

  useEffect(() => {
    if (
      !picking ||
      listTargetCmsFieldLinkCheckPending ||
      !listTargetCmsFieldUnlinked ||
      activeBeaconKey == null ||
      cmsFieldLinkPromptOpen
    ) {
      return;
    }
    if (cmsFieldLinkDismissedBeaconKeyRef.current === activeBeaconKey) {
      return;
    }
    cmsFieldLinkPromptVariantRef.current = "detected-unlinked";
    setCmsFieldLinkPromptVariant("detected-unlinked");
    setCmsFieldLinkPromptOpen(true);
  }, [
    picking,
    listTargetCmsFieldLinkCheckPending,
    listTargetCmsFieldUnlinked,
    activeBeaconKey,
    cmsFieldLinkPromptOpen,
  ]);

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
      setPendingSeedRowKey(null);
      const f = await readCmsSlotDesignerSlotPropsFile(beacon.container, rows.length);
      setDesignerListSlotFile(f);
      setListTargetPhase("loading");
      setListTargetRegisteredName(null);
      setListTargetOnCanvasCount(0);
      setListTargetOnCanvasCountResolved(false);
      cmsFieldLinkDismissedBeaconKeyRef.current = null;
      setPicking(true);
    } catch (err) {
      const message = formatWebflowDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setOpeningBeaconKey(null);
    }
  };

  const openCmsFieldLinkPrompt = useCallback((binding: { collectionId: string; fieldId: string }) => {
    cmsFieldLinkBindingRef.current = binding;
    cmsFieldLinkPromptVariantRef.current = "post-create";
    setCmsFieldLinkPromptVariant("post-create");
    setCmsFieldLinkDetectEpoch((epoch) => epoch + 1);
    setCmsFieldLinkPromptOpen(true);
  }, []);

  const handleCmsFieldLinkPromptOpenChange = useCallback(
    (open: boolean) => {
      if (!open && activeBeaconKey != null) {
        cmsFieldLinkDismissedBeaconKeyRef.current = activeBeaconKey;
      }
      setCmsFieldLinkPromptOpen(open);
    },
    [activeBeaconKey]
  );

  const promptCmsFieldLinkIfCreated = useCallback(
    (ensure: CmsSlotListCmsTextFieldEnsureResult | null | undefined) => {
      void promptCmsFieldLinkWhenVerified(ensure, openCmsFieldLinkPrompt);
    },
    [openCmsFieldLinkPrompt]
  );

  const handleRetryCmsFieldLink = async () => {
    if (cmsFieldLinkRetryPending || activeDataList == null) {
      return;
    }
    const listContainer = targetRef.current;
    const binding = cmsFieldLinkBindingRef.current;
    if (listContainer == null || binding == null) {
      return;
    }
    setCmsFieldLinkRetryPending(true);
    try {
      const result = await retryCmsSlotListTargetCmsFieldLink({
        dataList: activeDataList,
        listContainer,
        preferredDefinitionId: listTargetDefinitionIdRef.current,
        collectionId: binding.collectionId,
        fieldId: binding.fieldId,
      });
      if (result.ok) {
        setCmsFieldLinkPromptOpen(false);
        cmsFieldLinkDismissedBeaconKeyRef.current = null;
        refreshListTargetCmsFieldLinkStatus();
        void webflow.notify({ type: "Success", message: CMS_SLOTS_CMS_FIELD_LINK_TOAST_SUCCESS });
      } else {
        void webflow.notify({ type: "Error", message: result.message });
      }
    } finally {
      setCmsFieldLinkRetryPending(false);
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
    // Drive the route overlay through each create phase so the user sees progress instead of a static
    // "Creating slot list…" for the whole run. Placement emits its own sub-phases via onProgress below.
    setRouteTaskPhase(CMS_SLOTS_ROUTE_TASK_CREATING_LIST);
    try {
      listTargetDefinitionIdRef.current = null;
      const { container, dataList } = await createCmsSlotListOnPage(trimmed);
      setRouteTaskPhase(CMS_SLOTS_ROUTE_TASK_CREATING_LIST_TARGET);
      const { component: listTargetComponent, definitionId } = await createCmsSlotListTargetComponent({
        dataList,
        listContainer: container,
      });
      listTargetDefinitionIdRef.current = definitionId;
      const listTargetRegisteredName = await listTargetComponent.getName();
      setListTargetPhase("synced");
      setListTargetRegisteredName(listTargetRegisteredName);
      await writeCmsSlotDesignerConfiguredPoolKeys(container, []);
      // Placement runs first; the CMS field ensure (Data API create + visibility poll, several seconds) now happens
      // inside placement *after* the list target is on the canvas instead of blocking before any visible action.
      const { cmsEnsure, instancesOnPageCount } = await placeCmsSlotListTargetOnCanvas(
        dataList,
        container,
        definitionId,
        {
          onProgress: setRouteTaskPhase,
        }
      );
      promptCmsFieldLinkIfCreated(cmsEnsure);
      if (cmsEnsure == null) {
        void webflow.notify({
          type: "Warning",
          message:
            "CMS Plain Text field was not created. Open a CMS collection template page, or ensure another beacon on this page already has a CMS field.",
        });
      }
      targetRef.current = container;
      setActiveDataList(dataList);
      const beaconKey = cmsSlotListKey(container);
      setActiveBeaconKey(beaconKey);
      setSelected([]);
      setPicking(true);
      setCreateFormOpen(false);
      setListTargetOnCanvasCount(instancesOnPageCount);
      setListTargetOnCanvasCountResolved(true);
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
      setRouteTaskPhase(null);
    }
  };

  const selectedComponentIdSet = useMemo(() => new Set(selected.map((s) => s.componentId)), [selected]);

  useEffect(() => {
    void listTargetPhase;
    void designerSlotLabelRefreshToken;
    if (!isDesigner || !picking || selected.length === 0 || activeDataList == null) {
      setDesignerPublishedDisplayNames(null);
      return;
    }
    const container = targetRef.current;
    if (container == null) {
      setDesignerPublishedDisplayNames(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const text = await readCmsSlotListRuntimePayloadText({
          listContainer: container,
          dataList: activeDataList,
          preferredDefinitionId: listTargetDefinitionIdRef.current,
          currentCmsItemId,
        });
        if (cancelled) {
          return;
        }
        const parsed =
          text != null && text.trim() !== "" ? parseCmsSlotListRuntimePayload(text, selected.length) : null;
        setDesignerPublishedDisplayNames(publishedDisplayNamesForDesignerPool(parsed, selected));
      } catch {
        if (!cancelled) {
          setDesignerPublishedDisplayNames(selected.map((r) => r.name));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDesigner, picking, activeDataList, currentCmsItemId, selected, listTargetPhase, designerSlotLabelRefreshToken]);

  const composerDirty = useMemo(() => {
    if (activeComposer == null) return false;
    return cmsSlotCompositionSignature(composerDraft) !== activeComposer.initialSignature;
  }, [composerDraft, activeComposer]);

  // Guard app-chrome navigation (the header back button) the same way the in-route Designer/Composer controls
  // are guarded: when the composer holds unsaved edits, stash the pending navigation and surface the
  // unsaved-changes dialog instead of leaving. `finishComposerLeave` runs the stashed navigation on confirm.
  const guardLeaveWhileComposerDirty = useCallback(
    (proceed: () => void) => {
      if (activeComposer == null || !composerDirty) {
        proceed();
        return;
      }
      pendingExternalLeaveRef.current = proceed;
      composerLeaveDestinationRef.current = "external";
      setComposerLeaveDialogOpen(true);
    },
    [activeComposer, composerDirty]
  );
  useRegisterRouteLeaveGuard(guardLeaveWhileComposerDirty);

  const composerRowMeta = useMemo((): CmsSlotComposerRowMeta[] => {
    if (composerSlotProps == null || composerDesignerRows.length === 0) {
      return composerDraft.map((row) => ({ row, exposed: [] as ComposableInstancePropMeta[] }));
    }
    const map = draftToHiddenListIndices(composerDesignerRows, composerDraft);
    if (!map.ok) {
      return composerDraft.map((row) => ({ row, exposed: [] as ComposableInstancePropMeta[] }));
    }
    return composerDraft.map((row, j) => {
      const runtimeDomIdx = map.indices[j];
      const poolIdx =
        runtimeDomIdx != null ? designerPoolIndexForRuntimeCloneIndex(composerDesignerRows, runtimeDomIdx) : -1;
      const raw = poolIdx >= 0 ? (composerSlotProps.slots[poolIdx]?.exposed ?? []) : [];
      const designerRow = poolIdx >= 0 ? composerDesignerRows[poolIdx] : undefined;
      const live = designerRow != null ? composerDesignerComposable[designerRow.key] : undefined;
      return {
        row,
        exposed: mergeComposableMetaWithLive(raw, live),
      };
    });
  }, [composerDraft, composerDesignerRows, composerDesignerComposable, composerSlotProps]);

  const handleOpenComposer = async (beacon: CmsSlotListOnPage) => {
    setComposerOpeningKey(beacon.key);
    try {
      // Fresh per open: dedupe this open's component-definition reads while never serving a definition from a prior
      // open (so a prop newly exposed in the Designer always shows up here).
      clearCmsSlotComponentDefCache();
      const rows = await listInstancesInSlotListContainer(beacon.container);
      const configuredPoolKeys = await resolveCmsSlotDesignerConfiguredPoolKeys(beacon.container, rows);
      const designerScopedRows = filterHydratedCmsSlotRowsByPoolKeys(rows, configuredPoolKeys);
      // Palette, live composable metas, the slot-props file, and the target order are independent reads over the
      // same designer-scoped rows — fan them out so the open cost is the slowest call, not their sum. State is
      // committed once below so the panel mounts in a single render (React batches these async setters).
      const [allowedPalette, liveComposable, sp, { draft: rawDraft }] = await Promise.all([
        paletteForConfiguredPoolKeys(configuredPoolKeys, rows),
        listComposableMetaByInstanceKey(designerScopedRows),
        readCmsSlotDesignerSlotPropsFile(beacon.container, designerScopedRows.length),
        resolveComposerTargetOrder({
          listContainer: beacon.container,
          designerScopedRows,
          currentCmsItemId,
        }),
      ]);
      const mapped = draftToHiddenListIndices(designerScopedRows, rawDraft);
      const draft = mapped.ok
        ? normalizeComposerDraftPropValues(rawDraft, mapped.indices, designerScopedRows, sp, liveComposable)
        : rawDraft;
      const initialSignature = cmsSlotCompositionSignature(draft);
      setComposerAllowedPalette(allowedPalette);
      setComposerDesignerRows(designerScopedRows);
      setComposerDesignerComposable(liveComposable);
      setComposerSlotProps(sp);
      setComposerDraft(draft);
      setActiveComposer({ beacon, initialSignature });
    } catch (err) {
      const message = formatWebflowDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setComposerOpeningKey(null);
    }
  };

  const handleComposerBack = useCallback(() => {
    setActiveComposer(null);
    setComposerDraft([]);
    setComposerDesignerRows([]);
    setComposerDesignerComposable({});
    setComposerSlotProps(null);
    setComposerAllowedPalette([]);
    setComposerLeaveDialogOpen(false);
    setAutoOpenExposeDrawerRowKey(null);
  }, []);

  const handleEditorNoSlotsBack = useCallback(() => {
    navigate("/home");
  }, [navigate]);

  const finishComposerLeave = useCallback(() => {
    const destination = composerLeaveDestinationRef.current;
    composerLeaveDestinationRef.current = "composer-list";
    const pendingExternalLeave = pendingExternalLeaveRef.current;
    pendingExternalLeaveRef.current = null;
    handleComposerBack();
    if (destination === "designer") {
      void navigate("/cms-slots/designer");
    } else if (destination === "external") {
      pendingExternalLeave?.();
    }
  }, [handleComposerBack, navigate]);

  const handleComposerLeaveDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      // Dialog dismissed without confirming (Continue editing / Esc): drop any stashed external navigation
      // so a later in-route leave doesn't inherit it.
      composerLeaveDestinationRef.current = "composer-list";
      pendingExternalLeaveRef.current = null;
    }
    setComposerLeaveDialogOpen(open);
  }, []);

  const handleRequestComposerBack = useCallback(() => {
    composerLeaveDestinationRef.current = "composer-list";
    if (!composerDirty) {
      handleComposerBack();
      return;
    }
    setComposerLeaveDialogOpen(true);
  }, [composerDirty, handleComposerBack]);

  const handleRequestNavigateToDesigner = useCallback(() => {
    if (activeComposer == null) {
      void navigate("/cms-slots/designer");
      return;
    }
    composerLeaveDestinationRef.current = "designer";
    if (!composerDirty) {
      finishComposerLeave();
      return;
    }
    setComposerLeaveDialogOpen(true);
  }, [activeComposer, composerDirty, finishComposerLeave, navigate]);

  const handleDiscardComposerLeave = useCallback(() => {
    finishComposerLeave();
  }, [finishComposerLeave]);

  const handleComposerSave = useCallback(
    async (draftOverride?: CmsSlotCompositionDraftRow[]): Promise<boolean> => {
      const draftToSave = draftOverride ?? composerDraft;
      if (composerSavePending || activeComposer == null) {
        return false;
      }
      if (cmsSlotCompositionSignature(draftToSave) === activeComposer.initialSignature) {
        return true;
      }
      setComposerSavePending(true);
      setRouteTaskPhase(CMS_SLOTS_ROUTE_TASK_SAVING_COMPOSITION);
      try {
        const saved = await executeCmsSlotComposerSave({
          beacon: activeComposer.beacon,
          composerDraft: draftToSave,
          composerAllowedPalette,
          composerDesignerComposable,
          currentCmsItemId,
          listTargetDefinitionIdRef,
          setters: {
            setComposerDraft,
            setActiveComposer,
            setComposerDesignerRows,
            setComposerDesignerComposable,
            setComposerSlotProps,
          },
          onCompleteSideEffects: () => {
            setDesignerListCompositionStale(false);
            void fetchPageBeaconsAndRuntime().then((runtime) => {
              void loadComposerEligible({ runtime });
            });
          },
          onProgress: setRouteTaskPhase,
        });
        return saved;
      } catch (err) {
        const message = formatWebflowDesignerError(err);
        void webflow.notify({ type: "Error", message });
        return false;
      } finally {
        setComposerSavePending(false);
        setRouteTaskPhase(null);
      }
    },
    [
      composerAllowedPalette,
      composerDraft,
      composerDesignerComposable,
      composerSavePending,
      activeComposer,
      currentCmsItemId,
      loadComposerEligible,
      fetchPageBeaconsAndRuntime,
    ]
  );

  const handleSaveComposerLeave = useCallback(async () => {
    const saved = await handleComposerSave();
    if (!saved) {
      return;
    }
    finishComposerLeave();
  }, [finishComposerLeave, handleComposerSave]);

  const handleComposerAddFromPalette = useCallback((c: CmsSlotPaletteEntry) => {
    const rowKey = crypto.randomUUID();
    setComposerDraft((prev) => [
      ...prev,
      {
        key: rowKey,
        componentId: c.componentId,
        poolKey: c.poolKey,
        variant: c.variant,
        name: c.name,
        propValues: {},
      },
    ]);
    setAutoOpenExposeDrawerRowKey(rowKey);
  }, []);

  const handleComposerSetPropValue = useCallback((rowKey: string, propId: string, value: string) => {
    setComposerDraft((prev) =>
      prev.map((r) => (r.key === rowKey ? { ...r, propValues: { ...(r.propValues ?? {}), [propId]: value } } : r))
    );
  }, []);

  const handleComposerRenameSlotRow = useCallback((rowKey: string, name: string) => {
    setComposerDraft((prev) => prev.map((r) => (r.key === rowKey ? { ...r, name } : r)));
  }, []);

  const handleSetDesignerSlotExposed = useCallback(
    async (slotIndex: number, exposed: ComposableInstancePropMeta[]) => {
      await withSlotPropsWriteExclusive(async () => {
        const container = targetRef.current;
        if (container == null) {
          return;
        }
        const n = selectedRef.current.length;
        const f = await readCmsSlotDesignerSlotPropsFile(container, n);
        const nextSlots = f.slots.slice(0, n);
        while (nextSlots.length < n) {
          nextSlots.push({ exposed: [] });
        }
        nextSlots[slotIndex] = { exposed: [...exposed] };
        const out: CmsSlotDesignerSlotPropsFile = { v: 1, slots: nextSlots };
        await writeCmsSlotDesignerSlotPropsFile(container, out);
        setDesignerListSlotFile(out);
        setDesignerListCompositionStale(true);
      });
    },
    [withSlotPropsWriteExclusive]
  );

  const handleResyncDesignerSlotAttrs = useCallback(
    // `compositionChanged` is set when the caller also pinned a new variant alongside the re-tag: a variant pin changes
    // the pool composition, so the runtime payload stays out of sync (Sync still pending) even though the attrs are now
    // tagged. A plain expose re-tag leaves it `false` — re-tagging brings the composition back in sync.
    async (slotIndex: number, compositionChanged = false) => {
      await awaitSlotPropsWritesIdle();
      setRouteTaskPhase(CMS_SLOTS_ROUTE_TASK_TAGGING_DATA_ATTRIBUTES);
      try {
        const ok = await resyncDesignerSlotPropAttributesForSlotIndex({
          slotIndex,
          // Read the live selection: a variant commit chained right before this updates `selected` async, so the
          // captured closure value would be a render stale.
          selected: selectedRef.current,
          container: targetRef.current,
          setResyncingDesignerSlotKey,
          setSelected,
          onProgress: setRouteTaskPhase,
        });
        if (ok) {
          // “Make editable” is the commit point for a staged seed: persist pool keys + sync the list target. For an
          // already-committed slot it is just a re-tag, so the composition is back in sync — unless a variant was also
          // pinned, which leaves the runtime payload needing a Sync.
          const committingStagedSeed =
            pendingSeedRowKeyRef.current != null &&
            selectedRef.current[slotIndex]?.key === pendingSeedRowKeyRef.current;
          if (committingStagedSeed) {
            await commitPendingSeedRowRef.current();
          } else {
            setDesignerListCompositionStale(compositionChanged);
            await refreshPageBeacons();
          }
        }
        return ok;
      } finally {
        setRouteTaskPhase(null);
      }
    },
    [awaitSlotPropsWritesIdle, refreshPageBeacons]
  );

  const handleRenamePublishedDisplayName = useCallback(
    (rowKey: string, nextName: string) => {
      void (async () => {
        if (activeDataList == null || targetRef.current == null) {
          return;
        }
        const slotIndex = selected.findIndex((r) => r.key === rowKey);
        if (slotIndex < 0) {
          return;
        }
        setRenamingPublishedSlotKey(rowKey);
        try {
          const result = await renamePublishedSlotDisplayNameAtPoolIndex({
            listContainer: targetRef.current,
            dataList: activeDataList,
            preferredDefinitionId: listTargetDefinitionIdRef.current,
            currentCmsItemId,
            designerScopedRows: selected,
            poolIndex: slotIndex,
            nextName,
          });
          if (!result.ok) {
            void webflow.notify({ type: "Error", message: result.reason });
            return;
          }
          void webflow.notify({
            type: "Success",
            message: "Published slot name updated. Publish the site for changes on the live page.",
          });
          setDesignerSlotLabelRefreshToken((g) => g + 1);
          void refreshPageBeacons();
        } catch (err) {
          const message = formatWebflowDesignerError(err);
          void webflow.notify({ type: "Error", message });
        } finally {
          setRenamingPublishedSlotKey(null);
        }
      })();
    },
    [activeDataList, currentCmsItemId, selected, refreshPageBeacons]
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

  /**
   * Appends a hidden-list seed for `componentId` and selects it. When `sourceRow` is given (the Designer "Add variant"
   * action), the new seed copies that seed's prop overrides and inherits its exposed-props config so it starts
   * identical — only the variant differs. Returns the new row key (for auto-opening its sheet), or `null` on failure.
   */
  const addSeedRowToPool = async (
    componentId: string,
    sourceRow: HydratedCmsSlotRow | null
  ): Promise<string | null> => {
    const container = targetRef.current;
    if (!container || addPending) return null;
    // Cancel any still-pending auto-open from a prior add: its drawer-open is gated behind async
    // meta loading, so an unconsumed key would otherwise fire mid-add and pop the previous
    // component's (variant) sheet. The just-added row reassigns its own key on success.
    setAutoOpenExposeDrawerRowKey(null);
    setAddPending(true);
    setRouteTaskPhase(CMS_SLOTS_ROUTE_TASK_ADDING_COMPONENT);
    try {
      const instance = await appendComponentToSlotListContainer(container, componentId);
      if (sourceRow != null) {
        await copySeedPropOverrides(sourceRow.instance, instance);
      }
      const freshRows = await listInstancesInSlotListContainer(container);
      const addedRow = freshRows.find((row) => row.instance === instance) ?? freshRows[freshRows.length - 1];
      if (addedRow == null) {
        throw new Error("Could not resolve the new component on the hidden list.");
      }
      const rowKey = crypto.randomUUID();
      const nextSelected = [...selected, { ...addedRow, key: rowKey }];
      setSelected(nextSelected);
      setRouteTaskPhase(CMS_SLOTS_ROUTE_TASK_SAVING_SLOT_CONFIG);
      const sourceIndex = sourceRow != null ? selected.findIndex((s) => s.key === sourceRow.key) : -1;
      const slotF = inheritExposedFromExistingSeed(
        await readCmsSlotDesignerSlotPropsFile(container, nextSelected.length),
        sourceIndex,
        nextSelected.length - 1
      );
      await writeCmsSlotDesignerSlotPropsFile(container, slotF);
      setDesignerListSlotFile(slotF);
      // Stage, don't commit: the instance + slot-props seed exist so the props sheet can render, but pool keys and the
      // on-canvas list target are deferred until the user makes the seed editable or pins a non-base variant
      // ({@link commitPendingSeedRow}). Closing the sheet first discards it ({@link discardPendingSeedRow}). This keeps
      // a just-browsed component out of the slot list.
      setPendingSeedRowKey(rowKey);
      return rowKey;
    } catch (err) {
      void webflow.notify({ type: "Error", message: formatWebflowDesignerError(err) });
      return null;
    } finally {
      setAddPending(false);
      setRouteTaskPhase(null);
    }
  };

  /** Ensures the on-canvas list target reflects the current slot composition, prompting a CMS field link if one was made. */
  const ensureActiveListTargetAfterCompositionChange = async () => {
    const container = targetRef.current;
    const dataList = activeDataList;
    if (container == null || dataList == null) {
      return;
    }
    const cmsEnsure = await ensureListTargetAfterAppendingSlotRow({
      dataList,
      container,
      listTargetDefinitionIdRef,
      activeBeaconKey,
      listTargetReconcileCacheRef,
      setListTargetPhase,
      setListTargetRegisteredName,
      setListTargetOnCanvasCount,
      setListTargetOnCanvasCountResolved,
      onProgress: setRouteTaskPhase,
    });
    promptCmsFieldLinkIfCreated(cmsEnsure);
  };

  /**
   * Commits the staged seed to the slot list: persists pool keys for the current selection, marks the composition stale
   * (footer Sync still pending), and brings the on-canvas list target up to date. Invoked when the user makes the seed
   * editable or pins a non-base variant.
   */
  const commitPendingSeedRow = async () => {
    const container = targetRef.current;
    if (container == null) {
      return;
    }
    await writeCmsSlotDesignerConfiguredPoolKeys(
      container,
      selectedRef.current.map((row) => row.poolKey)
    );
    setDesignerListCompositionStale(true);
    setPendingSeedRowKey(null);
    void refreshPageBeacons();
    await ensureActiveListTargetAfterCompositionChange();
  };
  commitPendingSeedRowRef.current = commitPendingSeedRow;

  /** Discards a staged (uncommitted) seed: removes its instance and drops it from the selection — as if never added. */
  const discardPendingSeedRow = (row: HydratedCmsSlotRow) => {
    // The stage→discard cycle is net-zero, so restore the prior “stale” value rather than leaving handleRemove’s
    // sync hint set for a change the user backed out of.
    const staleBeforeDiscard = designerListCompositionStaleRef.current;
    if (pendingSeedRowKeyRef.current === row.key) {
      setPendingSeedRowKey(null);
    }
    void (async () => {
      await handleRemove(row);
      setDesignerListCompositionStale(staleBeforeDiscard);
    })();
  };

  const handleAddComponent = async (c: ComponentSearchResult) => {
    const rowKey = await addSeedRowToPool(c.id, null);
    if (rowKey != null) {
      setAutoOpenExposeDrawerRowKey(rowKey);
    }
  };

  const handleAddVariantFromSeed = async (row: HydratedCmsSlotRow) => {
    const rowKey = await addSeedRowToPool(row.componentId, row);
    if (rowKey != null) {
      setAutoOpenExposeDrawerRowKey(rowKey);
    }
  };

  const handleSyncInstallEmbed = async () => {
    if (embedSyncPending) return;
    const unconstrainedSlot = (designerListSlotFile?.slots ?? []).some((slot) =>
      hasUnconstrainedExposedImageProps(slot.exposed)
    );
    if (unconstrainedSlot) {
      void webflow.notify({
        type: "Error",
        message: "Set an export size for every exposed image field before syncing.",
      });
      return;
    }
    setEmbedSyncPending(true);
    try {
      await syncCmsSlotsInstallEmbedOnPage();
      setDesignerListCompositionStale(false);
      void webflow.notify({
        type: "Success",
        message: `Page custom code updated. ${CMS_SLOTS_PUBLISH_TO_APPLY_HINT}`,
      });
      const runtime = await fetchPageBeaconsAndRuntime();
      if (isComposer) {
        await loadComposerEligible({ runtime });
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
    setRouteTaskPhase(CMS_SLOTS_ROUTE_TASK_CHECKING_INSTALL);
    try {
      const r = await installCmsSlotsWrapperOnPage({ onProgress: setRouteTaskPhase });
      const message = r.reparented
        ? `Installed. Moved ${r.reparented} beacon(s) into the wrapper. ${CMS_SLOTS_PUBLISH_TO_APPLY_HINT}`
        : r.created
          ? `Installed. ${CMS_SLOTS_PUBLISH_TO_APPLY_HINT}`
          : "Already installed.";
      void webflow.notify({ type: "Success", message });
      try {
        await webflow.setSelectedElement(r.wrapper);
      } catch {
        /* selection is optional */
      }
      setCreateFormOpen(true);
      setDesignerListCompositionStale(false);
      setRouteTaskPhase(CMS_SLOTS_ROUTE_TASK_FINISHING);
      void refreshPageBeacons();
    } catch (err) {
      const message = formatWebflowDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setInstallPending(false);
      setRouteTaskPhase(null);
    }
  };

  const handleRenameBeacon = useCallback(
    async (beacon: CmsSlotListOnPage, nextDisplayName: string): Promise<boolean> => {
      if (renamePendingKey != null) {
        return false;
      }
      setRenamePendingKey(beacon.key);
      setRouteTaskPhase(CMS_SLOTS_ROUTE_TASK_RENAMING_LIST);
      try {
        const otherDataListsOnPage = new Set(
          pageBeacons.filter((entry) => entry.key !== beacon.key).map((entry) => entry.dataList)
        );
        const preferredDefinitionId =
          listTargetReconcileCacheRef.current?.beaconKey === beacon.key ? listTargetDefinitionIdRef.current : null;
        const result = await renameCmsSlotListOnPage({
          container: beacon.container,
          fromDataList: beacon.dataList,
          nextDisplayName,
          otherDataListsOnPage,
          preferredDefinitionId,
        });
        if (!result.ok) {
          void webflow.notify({ type: "Error", message: result.reason });
          return false;
        }
        if (activeBeaconKey === beacon.key) {
          setActiveDataList(result.dataList);
          const cached = listTargetReconcileCacheRef.current;
          if (cached?.beaconKey === beacon.key) {
            listTargetReconcileCacheRef.current = { ...cached, dataList: result.dataList };
          }
        }
        void webflow.notify({ type: "Success", message: CMS_SLOTS_TOAST_LIST_RENAMED });
        setDesignerListCompositionStale(true);
        void refreshPageBeacons();
        return true;
      } catch (err) {
        const message = formatWebflowDesignerError(err);
        void webflow.notify({ type: "Error", message });
        return false;
      } finally {
        setRenamePendingKey(null);
        setRouteTaskPhase(null);
      }
    },
    [activeBeaconKey, pageBeacons, refreshPageBeacons, renamePendingKey]
  );

  const handleConfirmDeleteBeacon = async () => {
    if (deletePendingKey != null) return;
    const target = beaconToDelete;
    if (!target) return;
    const shouldUninstallPage = uninstallWithLastBeaconDelete;
    const wasLastBeaconOnPage = isLastCmsSlotListOnPageForDelete;
    setDeletePendingKey(target.key);
    try {
      await deleteCmsSlotListAndListTargetDefinition(target.dataList, target.container);
      let uninstallResult: Awaited<ReturnType<typeof uninstallCmsSlotsPageInstall>> | undefined;
      if (shouldUninstallPage) {
        uninstallResult = await uninstallCmsSlotsPageInstall({ dataLists: [target.dataList] });
        await removeCmsSlotsWrapperIfNoSlotListsOnPage();
      }
      setBeaconToDelete(null);
      setUninstallWithLastBeaconDelete(false);
      const notify = resolveCmsSlotsDeleteBeaconNotify({
        shouldUninstallPage,
        wasLastBeaconOnPage,
        uninstallResult,
      });
      void webflow.notify({ type: notify.type, message: notify.message });
      await autoSyncPageRuntimeAfterSlotDelete({
        shouldUninstallPage,
        setDesignerListCompositionStale,
      });
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
      const removeIdx = selected.findIndex((p) => p.key === row.key);
      const slotFileBefore = await readCmsSlotDesignerSlotPropsFile(container, selected.length);
      const ownerExposedIds = new Set(
        (removeIdx >= 0 ? (slotFileBefore.slots[removeIdx]?.exposed ?? []) : []).map((e) => e.propId)
      );
      const strip = await stripDesignerCodalynAttrsFromComponentInstance(row.instance, ownerExposedIds);
      if (strip.errors.length > 0) {
        console.warn("[beacon] designer attr strip before remove (non-fatal):", strip.errors);
      }
      await removeComponentInstanceFromCanvas(row.instance);
      const nextSelected = selected.filter((p) => p.key !== row.key);
      setSelected(nextSelected);
      await writeCmsSlotDesignerConfiguredPoolKeys(
        container,
        nextSelected.map((entry) => entry.poolKey)
      );
      const nextSlots = removeIdx >= 0 ? slotFileBefore.slots.filter((_, j) => j !== removeIdx) : slotFileBefore.slots;
      const out: CmsSlotDesignerSlotPropsFile = { v: 1, slots: nextSlots };
      await writeCmsSlotDesignerSlotPropsFile(container, out);
      setDesignerListSlotFile(out);
      setDesignerListCompositionStale(true);
      void refreshPageBeacons();
    } catch (err) {
      const message = formatWebflowDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setRemovingKey(null);
    }
  };

  // Applies a staged variant pin to a seed: writes the variant prop on the instance, re-reads the seed, and persists the
  // updated pool keys. This is a pure variant write — the caller (a commit button) is responsible for committing a
  // staged seed / syncing the on-canvas list target. The variant picker only stages a draft locally; nothing here runs
  // until the user presses a commit button, so picking a variant never kicks off a place-on-canvas pass on its own.
  const handleSetSeedVariant = async (row: HydratedCmsSlotRow, propId: string, variantId: string) => {
    if (settingVariantKey) return;
    const container = targetRef.current;
    if (!container) return;
    setSettingVariantKey(row.key);
    try {
      await setSeedInstanceVariant(row.instance, propId, variantId);
      // Re-read this seed so its variant/poolKey reflect the new pin (order is unchanged, so match by DOM index).
      const fresh = await listInstancesInSlotListContainer(container);
      const updated = fresh.find((r) => r.domChildIndex === row.domChildIndex);
      const nextSelected = selectedRef.current.map((s) =>
        s.key === row.key && updated != null
          ? { ...s, variant: updated.variant, poolKey: updated.poolKey, instance: updated.instance }
          : s
      );
      setSelected(nextSelected);
      // Keep the ref fresh so a commit button chained right after this (e.g. "Make editable") writes pool keys from the
      // variant-updated selection rather than the pre-render snapshot.
      selectedRef.current = nextSelected;
      await writeCmsSlotDesignerConfiguredPoolKeys(
        container,
        nextSelected.map((entry) => entry.poolKey)
      );
      setDesignerListCompositionStale(true);
      void refreshPageBeacons();
    } catch (err) {
      void webflow.notify({ type: "Error", message: formatWebflowDesignerError(err) });
    } finally {
      setSettingVariantKey(null);
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
      const cmsEnsure = await ensureCmsSlotListCmsTextFieldOnList(listContainer, activeDataList);
      const { component: created, definitionId } = await createCmsSlotListTargetComponent({
        dataList: activeDataList,
        listContainer,
      });
      listTargetDefinitionIdRef.current = definitionId;
      const registeredName = await created.getName();
      setListTargetRegisteredName(registeredName);
      setListTargetPhase("synced");
      promptCmsFieldLinkIfCreated(cmsEnsure);
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

  const handleFocusListTargetOnCanvas = async () => {
    if (
      isListTargetCanvasActionBlocked(
        listTargetFocusOnCanvasPending,
        listTargetPlaceOnCanvasPending,
        listTargetCreatePending,
        listTargetRemovePending,
        listTargetPhase,
        listTargetOnCanvasCountResolved,
        activeDataList
      ) ||
      activeDataList == null ||
      listTargetOnCanvasCount === 0
    ) {
      return;
    }
    const dataList = activeDataList;
    const listContainer = targetRef.current;
    if (!listContainer) return;
    if (
      await isCmsSlotListTargetInstanceSelected(dataList, listContainer, {
        preferredDefinitionId: listTargetDefinitionIdRef.current,
      })
    ) {
      return;
    }
    setListTargetFocusOnCanvasPending(true);
    setRouteTaskPhase(CMS_SLOTS_ROUTE_TASK_FOCUSING_ON_CANVAS);
    try {
      const instance = await focusCmsSlotListTargetOnCanvas(dataList, listContainer, listTargetDefinitionIdRef.current);
      if (instance == null) {
        setListTargetOnCanvasCount(0);
        setListTargetOnCanvasCountResolved(true);
        void webflow.notify({ type: "Warning", message: CMS_SLOTS_TOAST_LIST_TARGET_NOT_ON_CANVAS });
        return;
      }
      void webflow.notify({ type: "Success", message: CMS_SLOTS_TOAST_LIST_TARGET_FOCUSED });
    } catch (err) {
      const message = formatWebflowDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setListTargetFocusOnCanvasPending(false);
      setRouteTaskPhase(null);
    }
  };

  const handlePlaceListTargetOnCanvas = async () => {
    if (
      isListTargetCanvasActionBlocked(
        listTargetFocusOnCanvasPending,
        listTargetPlaceOnCanvasPending,
        listTargetCreatePending,
        listTargetRemovePending,
        listTargetPhase,
        listTargetOnCanvasCountResolved,
        activeDataList
      ) ||
      activeDataList == null
    ) {
      return;
    }
    const dataList = activeDataList;
    const listContainer = targetRef.current;
    if (!listContainer) return;
    setListTargetPlaceOnCanvasPending(true);
    setRouteTaskPhase(CMS_SLOTS_ROUTE_TASK_PLACING_ON_CANVAS);
    try {
      const { instance, alreadyExisted, cmsFieldWasCreated } = await placeCmsSlotListTargetOnCanvas(
        dataList,
        listContainer,
        listTargetDefinitionIdRef.current,
        { onProgress: setRouteTaskPhase }
      );
      await finishListTargetCanvasPlacement({
        instance,
        alreadyExisted,
        cmsFieldWasCreated,
        activeDataList: dataList,
        listContainer,
        preferredDefinitionId: listTargetDefinitionIdRef.current,
        openCmsFieldLinkPrompt,
        setListTargetOnCanvasCount,
        setListTargetOnCanvasCountResolved,
      });
    } catch (err) {
      const message = formatWebflowDesignerError(err);
      void webflow.notify({ type: "Error", message });
    } finally {
      setListTargetPlaceOnCanvasPending(false);
      setRouteTaskPhase(null);
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
      } finally {
        setListTargetOnCanvasCountResolved(true);
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
            "List target component removed from the site. The CMS plain text field for this CMS slot is unchanged — delete the CMS slot to remove that field.",
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
      pageRuntimeSyncRelevant={pageRuntimeSyncRelevant}
      pageRuntimeStatusLoading={pageRuntimeStatusLoading}
      syncShellOk={syncShellOk}
      syncShellReason={syncShellReason}
      isDesigner={isDesigner}
      isComposer={isComposer}
      picking={picking}
      activeDataList={activeDataList}
      activeListLabel={activeListLabel}
      beaconsWrapperInstalled={beaconsWrapperInstalled}
      installPending={installPending}
      pageBeacons={pageBeacons}
      pageScanLoading={pageScanLoading}
      pageBootBlocking={pageBootBlocking}
      routeTaskPhase={routeTaskPhase}
      slotPropsWritePending={slotPropsWritePending}
      routeStateKnown={routeStateKnown}
      beaconName={beaconName}
      setBeaconName={setBeaconName}
      createPending={createPending}
      createFormOpen={createFormOpen}
      setCreateFormOpen={setCreateFormOpen}
      openingBeaconKey={openingBeaconKey}
      deletePendingKey={deletePendingKey}
      renamePendingKey={renamePendingKey}
      setBeaconToDelete={setBeaconToDelete}
      onRenameBeacon={handleRenameBeacon}
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
      onSetSeedVariant={handleSetSeedVariant}
      settingVariantKey={settingVariantKey}
      onAddVariant={handleAddVariantFromSeed}
      listTargetPhase={listTargetPhase}
      listTargetOnCanvasCount={listTargetOnCanvasCount}
      listTargetOnCanvasCountResolved={listTargetOnCanvasCountResolved}
      onCreateListTarget={handleCreateListTarget}
      onRequestRemoveListTarget={handleRequestRemoveListTarget}
      onFocusListTargetOnCanvas={handleFocusListTargetOnCanvas}
      onPlaceListTargetOnCanvas={handlePlaceListTargetOnCanvas}
      listTargetCreatePending={listTargetCreatePending}
      listTargetRemovePending={listTargetRemovePending}
      listTargetFocusOnCanvasPending={listTargetFocusOnCanvasPending}
      listTargetPlaceOnCanvasPending={listTargetPlaceOnCanvasPending}
      listTargetSelectedOnCanvas={listTargetSelectedOnCanvas}
      designerListSlotFile={designerListSlotFile}
      onSetDesignerSlotExposed={handleSetDesignerSlotExposed}
      onResyncDesignerSlotAttrs={handleResyncDesignerSlotAttrs}
      resyncingDesignerSlotKey={resyncingDesignerSlotKey}
      designerPublishedDisplayNames={designerPublishedDisplayNames}
      onRenamePublishedDisplayName={handleRenamePublishedDisplayName}
      renamingPublishedSlotKey={renamingPublishedSlotKey}
      autoOpenExposeDrawerRowKey={autoOpenExposeDrawerRowKey}
      onAutoOpenExposeDrawerConsumed={() => setAutoOpenExposeDrawerRowKey(null)}
      pendingSeedRowKey={pendingSeedRowKey}
      onDiscardPendingSeed={discardPendingSeedRow}
      exitToList={exitToList}
      composerEligibleLoading={composerEligibleLoading}
      composerEligibleResolved={composerEligibleResolved}
      composerRuntimeOk={composerRuntimeOk}
      composerEligible={composerEligible}
      composerOpeningKey={composerOpeningKey}
      onOpenComposer={handleOpenComposer}
      activeComposer={activeComposer}
      composerDraft={composerDraft}
      composerDirty={composerDirty}
      composerAllowedPalette={composerAllowedPalette}
      onComposerAddFromPalette={handleComposerAddFromPalette}
      onComposerReorderDraft={handleComposerReorderDraft}
      onComposerRemoveDraft={handleComposerRemoveDraft}
      onComposerBack={handleRequestComposerBack}
      onRequestNavigateToDesigner={handleRequestNavigateToDesigner}
      onEditorNoSlotsBack={handleEditorNoSlotsBack}
      onComposerSave={handleComposerSave}
      composerSavePending={composerSavePending}
      composerLeaveDialogOpen={composerLeaveDialogOpen}
      setComposerLeaveDialogOpen={handleComposerLeaveDialogOpenChange}
      onComposerLeaveDiscard={handleDiscardComposerLeave}
      onComposerLeaveSave={handleSaveComposerLeave}
      onSyncInstallEmbed={handleSyncInstallEmbed}
      embedSyncPending={embedSyncPending}
      composerRowMeta={composerRowMeta}
      onComposerSetPropValue={handleComposerSetPropValue}
      onComposerRenameSlotRow={handleComposerRenameSlotRow}
      composerEditingContext={composerEditingContext}
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
      cmsFieldLinkPromptOpen={cmsFieldLinkPromptOpen}
      cmsFieldLinkPromptVariant={cmsFieldLinkPromptVariant}
      cmsFieldLinkNavReady={cmsFieldLinkNavReady}
      cmsFieldLinkRetryPending={cmsFieldLinkRetryPending}
      onCmsFieldLinkPromptOpenChange={handleCmsFieldLinkPromptOpenChange}
      onRetryCmsFieldLink={handleRetryCmsFieldLink}
    />
  );
}
