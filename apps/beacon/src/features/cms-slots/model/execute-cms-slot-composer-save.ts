import type { MutableRefObject } from "react";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  buildCmsSlotRuntimePropRow,
  listComposableMetaByInstanceKey,
  mergeComposableMetaWithLiveResolved,
} from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  cmsSlotCompositionSignature,
  draftToHiddenListIndices,
} from "@/features/cms-slots/model/cms-slot-composer-cms-draft";
import {
  mergeSlotFileAfterListRebuild,
  readCmsSlotEngineSlotPropsFile,
  writeCmsSlotEngineSlotPropsFile,
} from "@/features/cms-slots/model/cms-slot-engine-slot-props";
import {
  saveCmsSlotListRuntimePayloadToCmsItem,
  setCmsSlotListTargetInstancesStaticRuntimeText,
} from "@/features/cms-slots/model/cms-slot-list-cms-composition-save";
import { serializeCmsSlotListRuntimePayload } from "@/features/cms-slots/model/cms-slot-list-runtime-payload";
import {
  bindCmsSlotListTargetInstancesToListCmsText,
  ensureCmsSlotListCmsTextFieldOnList,
  getCmsTemplateCollectionIdFromCurrentPage,
} from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import { listCmsSlotListTargetInstancesOnPage } from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import { syncCmsSlotPageInlineScript } from "@/features/cms-slots/model/cms-slot-page-inline-script";
import {
  type CmsSlotListOnPage,
  enginePoolIndexForRuntimeCloneIndex,
  filterHydratedCmsSlotRowsByComponentIds,
  type HydratedCmsSlotRow,
  listInstancesInSlotListContainer,
  resolveCmsSlotEngineConfiguredComponentIds,
  writeCmsSlotEngineConfiguredComponentIds,
} from "@/features/cms-slots/model/cms-slot-page-targets";
import { getCmsSlotListTargetComponentOrNull } from "@/features/cms-slots/model/create-cms-slot-list-target-component";
import {
  applyCmsSlotCompositionDraft,
  type CmsSlotCompositionDraftRow,
  type CmsSlotPaletteEntry,
  ensureEnginePoolHasDraftComponentTypes,
} from "@/features/cms-slots/model/site-components";
import {
  CMS_SLOTS_ROUTE_TASK_APPLYING_COMPOSITION,
  CMS_SLOTS_ROUTE_TASK_CHECKING_CMS_FIELD,
  CMS_SLOTS_ROUTE_TASK_FINISHING,
  CMS_SLOTS_ROUTE_TASK_LINKING_CMS_FIELD,
  CMS_SLOTS_ROUTE_TASK_SAVING_CMS_LAYOUT,
  CMS_SLOTS_ROUTE_TASK_SAVING_COMPOSITION,
  CMS_SLOTS_ROUTE_TASK_SAVING_SLOT_CONFIG,
  CMS_SLOTS_ROUTE_TASK_UPDATING_LIST_TARGET,
} from "@/shared/lib/cms-slots-feature-copy";
import { getTowerOrigin } from "@/shared/lib/tower-client";

type ActiveComposerState = {
  beacon: CmsSlotListOnPage;
  initialSignature: string;
};

/**
 * Best-effort re-upload of the footer runtime so a save always ships a runtime that can read the current payload
 * contract. The manual Sync button remains the explicit repair path. No-op without Tower; never fails the save.
 */
async function trySyncCmsSlotPageRuntime(): Promise<void> {
  if (!getTowerOrigin().trim()) {
    return;
  }
  try {
    await syncCmsSlotPageInlineScript();
  } catch (e) {
    console.warn("[cms-slots] runtime sync after save (non-fatal)", e);
  }
}

function buildPropValueRowsForDraft(params: {
  draftToApply: CmsSlotCompositionDraftRow[];
  mapped: { ok: true; indices: number[] };
  engineScopedRows: HydratedCmsSlotRow[];
  slotF: Awaited<ReturnType<typeof readCmsSlotEngineSlotPropsFile>>;
  composerEngineComposable: Record<string, ComposableInstancePropMeta[] | undefined>;
}): Array<Record<string, string>> {
  const { draftToApply, mapped, engineScopedRows, slotF, composerEngineComposable } = params;
  return draftToApply.map((d, j) => {
    const runtimeDomIdx = j < mapped.indices.length ? mapped.indices[j] : undefined;
    if (runtimeDomIdx == null) {
      return {};
    }
    const poolI = enginePoolIndexForRuntimeCloneIndex(engineScopedRows, runtimeDomIdx);
    if (poolI < 0) {
      return {};
    }
    const engineRow = engineScopedRows[poolI];
    const rawEx = slotF.slots[poolI]?.exposed ?? [];
    const { metas, aliasToCanonical } = mergeComposableMetaWithLiveResolved(
      rawEx,
      engineRow != null ? composerEngineComposable[engineRow.key] : undefined
    );
    return buildCmsSlotRuntimePropRow(d, metas, aliasToCanonical);
  });
}

async function finalizeStaticComposerReload(beacon: CmsSlotListOnPage, setters: ComposerSaveSetters): Promise<void> {
  const rows2 = await listInstancesInSlotListContainer(beacon.container);
  const c2 = await resolveCmsSlotEngineConfiguredComponentIds(beacon.container, rows2);
  const e2 = filterHydratedCmsSlotRowsByComponentIds(rows2, c2);
  setters.setComposerEngineRows(e2);
  setters.setComposerEngineComposable(await listComposableMetaByInstanceKey(e2));
  setters.setComposerSlotProps(await readCmsSlotEngineSlotPropsFile(beacon.container, e2.length));
}

type ComposerSaveSetters = {
  setComposerDraft: (
    v: CmsSlotCompositionDraftRow[] | ((p: CmsSlotCompositionDraftRow[]) => CmsSlotCompositionDraftRow[])
  ) => void;
  setActiveComposer: (
    v: ActiveComposerState | null | ((p: ActiveComposerState | null) => ActiveComposerState | null)
  ) => void;
  setComposerEngineRows: (v: HydratedCmsSlotRow[]) => void;
  setComposerEngineComposable: (v: Record<string, ComposableInstancePropMeta[]>) => void;
  setComposerSlotProps: (v: Awaited<ReturnType<typeof readCmsSlotEngineSlotPropsFile>>) => void;
};

async function applyComposerSaveCmsTemplatePath(args: {
  beacon: CmsSlotListOnPage;
  currentCmsItemId: string | null;
  listTargetDefinitionIdRef: MutableRefObject<string | null>;
  hiddenListIndicesForRuntime: number[];
  propValueRows: Array<Record<string, string>>;
  slotLabels: string[];
  draftToApply: CmsSlotCompositionDraftRow[];
  setters: ComposerSaveSetters;
  onProgress?: (message: string) => void;
}): Promise<boolean> {
  const {
    beacon,
    currentCmsItemId,
    listTargetDefinitionIdRef,
    hiddenListIndicesForRuntime,
    propValueRows,
    slotLabels,
    draftToApply,
    setters,
    onProgress,
  } = args;
  if (!getTowerOrigin().trim() || currentCmsItemId == null) {
    void webflow.notify({
      type: "Error",
      message:
        "On a collection template, select a collection item in the Designer and connect Codalyn to Tower. The layout is saved only to the CMS field — the Engine list on the page is not changed.",
    });
    return false;
  }
  onProgress?.(CMS_SLOTS_ROUTE_TASK_CHECKING_CMS_FIELD);
  const cmsEnsure = await ensureCmsSlotListCmsTextFieldOnList(beacon.container, beacon.dataList);
  if (cmsEnsure == null) {
    void webflow.notify({
      type: "Error",
      message: "Could not use the list CMS text field. Create and sync a list target for this list, then try again.",
    });
    return false;
  }
  const binding = cmsEnsure.binding;
  const listTargetDef = await getCmsSlotListTargetComponentOrNull(
    beacon.dataList,
    beacon.container,
    listTargetDefinitionIdRef.current
  );
  if (listTargetDef != null) {
    onProgress?.(CMS_SLOTS_ROUTE_TASK_LINKING_CMS_FIELD);
    const listTargetOnPage = await listCmsSlotListTargetInstancesOnPage(beacon.dataList, beacon.container, {
      preferredDefinitionId: listTargetDefinitionIdRef.current,
    });
    await bindCmsSlotListTargetInstancesToListCmsText({
      dataList: beacon.dataList,
      listContainer: beacon.container,
      def: listTargetDef,
      instances: listTargetOnPage,
      resolvedBinding: binding,
    });
  }
  let cmsLayoutSaveFailed = false;
  try {
    onProgress?.(CMS_SLOTS_ROUTE_TASK_SAVING_CMS_LAYOUT);
    await saveCmsSlotListRuntimePayloadToCmsItem({
      collectionId: binding.collectionId,
      fieldId: binding.fieldId,
      cmsItemId: currentCmsItemId,
      hiddenListIndices: hiddenListIndicesForRuntime,
      propValueRows,
      slotLabels,
    });
  } catch (e) {
    cmsLayoutSaveFailed = true;
    console.warn("[cms-slots] CMS list text save", e);
  }
  if (!cmsLayoutSaveFailed) {
    await trySyncCmsSlotPageRuntime();
  }
  onProgress?.(CMS_SLOTS_ROUTE_TASK_FINISHING);
  setters.setComposerDraft(draftToApply);
  if (!cmsLayoutSaveFailed) {
    setters.setActiveComposer((prev) =>
      prev ? { ...prev, initialSignature: cmsSlotCompositionSignature(draftToApply) } : null
    );
  }
  if (cmsLayoutSaveFailed) {
    void webflow.notify({
      type: "Warning",
      message: "The CMS list text field was not saved. Check Tower and try again.",
    });
  } else {
    void webflow.notify({
      type: "Success",
      message:
        "Layout saved to the current CMS item’s text field. Publish for the live site. The Engine reference list was not changed.",
    });
  }
  return true;
}

async function applyComposerSaveStaticPagePath(args: {
  beacon: CmsSlotListOnPage;
  listTargetDefinitionIdRef: MutableRefObject<string | null>;
  engineScopedRows: HydratedCmsSlotRow[];
  draftToApply: CmsSlotCompositionDraftRow[];
  propValueRows: Array<Record<string, string>>;
  slotLabels: string[];
  setters: ComposerSaveSetters;
  onProgress?: (message: string) => void;
}): Promise<void> {
  const {
    beacon,
    listTargetDefinitionIdRef,
    engineScopedRows,
    draftToApply,
    propValueRows,
    slotLabels,
    setters,
    onProgress,
  } = args;
  const beforePoolIds = engineScopedRows.map((r) => r.componentId);
  const oldFile = await readCmsSlotEngineSlotPropsFile(beacon.container, engineScopedRows.length);
  onProgress?.(CMS_SLOTS_ROUTE_TASK_APPLYING_COMPOSITION);
  const rebuiltRows = await applyCmsSlotCompositionDraft(beacon.container, draftToApply);
  const rebuiltMapped = draftToHiddenListIndices(rebuiltRows, draftToApply);
  const hiddenListIndicesForRuntime = rebuiltMapped.ok
    ? rebuiltMapped.indices
    : rebuiltRows.map((r) => r.domChildIndex);
  const runtimeText = serializeCmsSlotListRuntimePayload(hiddenListIndicesForRuntime, propValueRows, slotLabels);
  const newFile = mergeSlotFileAfterListRebuild(beforePoolIds, oldFile, draftToApply);
  onProgress?.(CMS_SLOTS_ROUTE_TASK_SAVING_SLOT_CONFIG);
  await writeCmsSlotEngineSlotPropsFile(beacon.container, newFile);
  await writeCmsSlotEngineConfiguredComponentIds(
    beacon.container,
    rebuiltRows.map((row) => row.componentId)
  );
  onProgress?.(CMS_SLOTS_ROUTE_TASK_UPDATING_LIST_TARGET);
  await setCmsSlotListTargetInstancesStaticRuntimeText({
    dataList: beacon.dataList,
    listContainer: beacon.container,
    preferredDefinitionId: listTargetDefinitionIdRef.current,
    text: runtimeText,
  });
  await trySyncCmsSlotPageRuntime();
  const normalizedDraft = draftToApply.map((d) => ({
    key: d.key,
    componentId: d.componentId,
    name: d.name,
    propValues: d.propValues,
  }));
  setters.setComposerDraft(normalizedDraft);
  setters.setActiveComposer((prev) =>
    prev
      ? {
          ...prev,
          initialSignature: cmsSlotCompositionSignature(normalizedDraft),
        }
      : null
  );
  onProgress?.(CMS_SLOTS_ROUTE_TASK_FINISHING);
  await finalizeStaticComposerReload(beacon, setters);
  void webflow.notify({
    type: "Success",
    message: "Composition saved. Publish for the live site.",
  });
}

export async function executeCmsSlotComposerSave(input: {
  beacon: CmsSlotListOnPage;
  composerDraft: CmsSlotCompositionDraftRow[];
  composerAllowedPalette: CmsSlotPaletteEntry[];
  composerEngineComposable: Record<string, ComposableInstancePropMeta[]>;
  currentCmsItemId: string | null;
  listTargetDefinitionIdRef: MutableRefObject<string | null>;
  setters: ComposerSaveSetters;
  onCompleteSideEffects: () => void;
  onProgress?: (message: string) => void;
}): Promise<boolean> {
  const {
    beacon,
    composerDraft,
    composerAllowedPalette,
    composerEngineComposable,
    currentCmsItemId,
    listTargetDefinitionIdRef,
    setters,
    onCompleteSideEffects,
    onProgress,
  } = input;

  onProgress?.(CMS_SLOTS_ROUTE_TASK_SAVING_COMPOSITION);

  const allowedComponentIdSet = new Set(composerAllowedPalette.map((entry) => entry.id));
  const draftToApply = composerDraft.filter((row) => allowedComponentIdSet.has(row.componentId));
  if (draftToApply.length === 0 && composerDraft.length > 0) {
    void webflow.notify({
      type: "Error",
      message: "This list only allows component types configured in Engine.",
    });
    return false;
  }

  const rows = await listInstancesInSlotListContainer(beacon.container);
  const configuredComponentIds = await resolveCmsSlotEngineConfiguredComponentIds(beacon.container, rows);
  let engineScopedRows = filterHydratedCmsSlotRowsByComponentIds(rows, configuredComponentIds);
  engineScopedRows = await ensureEnginePoolHasDraftComponentTypes(beacon.container, draftToApply);
  const mapped = draftToHiddenListIndices(engineScopedRows, draftToApply);
  if (!mapped.ok) {
    void webflow.notify({
      type: "Error",
      message:
        "Your order uses component types that are not available in the Engine list (or not enough instances). Add them in Engine, then try again.",
    });
    return false;
  }

  const slotF = await readCmsSlotEngineSlotPropsFile(beacon.container, engineScopedRows.length);
  const propValueRows = buildPropValueRowsForDraft({
    draftToApply,
    mapped,
    engineScopedRows,
    slotF,
    composerEngineComposable,
  });

  const onCmsTemplate = (await getCmsTemplateCollectionIdFromCurrentPage()) != null;
  const slotLabels = draftToApply.map((d) => d.name);

  if (onCmsTemplate) {
    const completed = await applyComposerSaveCmsTemplatePath({
      beacon,
      currentCmsItemId,
      listTargetDefinitionIdRef,
      hiddenListIndicesForRuntime: mapped.indices,
      propValueRows,
      slotLabels,
      draftToApply,
      setters,
      onProgress,
    });
    if (!completed) {
      return false;
    }
  } else {
    await applyComposerSaveStaticPagePath({
      beacon,
      listTargetDefinitionIdRef,
      engineScopedRows,
      draftToApply,
      propValueRows,
      slotLabels,
      setters,
      onProgress,
    });
  }
  onCompleteSideEffects();
  return true;
}
