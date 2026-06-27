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
  readCmsSlotDesignerSlotPropsFile,
  writeCmsSlotDesignerSlotPropsFile,
} from "@/features/cms-slots/model/cms-slot-designer-slot-props";
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
  designerPoolIndexForRuntimeCloneIndex,
  filterHydratedCmsSlotRowsByPoolKeys,
  type HydratedCmsSlotRow,
  listInstancesInSlotListContainer,
  resolveCmsSlotDesignerConfiguredPoolKeys,
  writeCmsSlotDesignerConfiguredPoolKeys,
} from "@/features/cms-slots/model/cms-slot-page-targets";
import { getCmsSlotListTargetComponentOrNull } from "@/features/cms-slots/model/create-cms-slot-list-target-component";
import {
  applyCmsSlotCompositionDraft,
  type CmsSlotCompositionDraftRow,
  type CmsSlotPaletteEntry,
  ensureDesignerPoolHasDraftComponentTypes,
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
    const detail = e instanceof Error && e.message ? e.message : "Unknown error.";
    void webflow.notify({
      type: "Warning",
      message: `Layout saved, but the page runtime script could not be synced: ${detail} Use the Sync button to retry, then republish.`,
    });
  }
}

function buildPropValueRowsForDraft(params: {
  draftToApply: CmsSlotCompositionDraftRow[];
  mapped: { ok: true; indices: number[] };
  designerScopedRows: HydratedCmsSlotRow[];
  slotF: Awaited<ReturnType<typeof readCmsSlotDesignerSlotPropsFile>>;
  composerDesignerComposable: Record<string, ComposableInstancePropMeta[] | undefined>;
}): Array<Record<string, string>> {
  const { draftToApply, mapped, designerScopedRows, slotF, composerDesignerComposable } = params;
  return draftToApply.map((d, j) => {
    const runtimeDomIdx = j < mapped.indices.length ? mapped.indices[j] : undefined;
    if (runtimeDomIdx == null) {
      return {};
    }
    const poolI = designerPoolIndexForRuntimeCloneIndex(designerScopedRows, runtimeDomIdx);
    if (poolI < 0) {
      return {};
    }
    const designerRow = designerScopedRows[poolI];
    const rawEx = slotF.slots[poolI]?.exposed ?? [];
    const { metas, aliasToCanonical } = mergeComposableMetaWithLiveResolved(
      rawEx,
      designerRow != null ? composerDesignerComposable[designerRow.key] : undefined
    );
    return buildCmsSlotRuntimePropRow(d, metas, aliasToCanonical);
  });
}

async function finalizeStaticComposerReload(beacon: CmsSlotListOnPage, setters: ComposerSaveSetters): Promise<void> {
  const rows2 = await listInstancesInSlotListContainer(beacon.container);
  const c2 = await resolveCmsSlotDesignerConfiguredPoolKeys(beacon.container, rows2);
  const e2 = filterHydratedCmsSlotRowsByPoolKeys(rows2, c2);
  setters.setComposerDesignerRows(e2);
  setters.setComposerDesignerComposable(await listComposableMetaByInstanceKey(e2));
  setters.setComposerSlotProps(await readCmsSlotDesignerSlotPropsFile(beacon.container, e2.length));
}

type ComposerSaveSetters = {
  setComposerDraft: (
    v: CmsSlotCompositionDraftRow[] | ((p: CmsSlotCompositionDraftRow[]) => CmsSlotCompositionDraftRow[])
  ) => void;
  setActiveComposer: (
    v: ActiveComposerState | null | ((p: ActiveComposerState | null) => ActiveComposerState | null)
  ) => void;
  setComposerDesignerRows: (v: HydratedCmsSlotRow[]) => void;
  setComposerDesignerComposable: (v: Record<string, ComposableInstancePropMeta[]>) => void;
  setComposerSlotProps: (v: Awaited<ReturnType<typeof readCmsSlotDesignerSlotPropsFile>>) => void;
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
        "On a collection template, select a collection item in the Designer and connect Codalyn to Tower. The layout is saved only to the CMS field — the Designer list on the page is not changed.",
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
        "Layout saved to the current CMS item’s text field. Publish for the live site. The Designer reference list was not changed.",
    });
  }
  return true;
}

async function applyComposerSaveStaticPagePath(args: {
  beacon: CmsSlotListOnPage;
  listTargetDefinitionIdRef: MutableRefObject<string | null>;
  designerScopedRows: HydratedCmsSlotRow[];
  draftToApply: CmsSlotCompositionDraftRow[];
  propValueRows: Array<Record<string, string>>;
  slotLabels: string[];
  setters: ComposerSaveSetters;
  onProgress?: (message: string) => void;
}): Promise<void> {
  const {
    beacon,
    listTargetDefinitionIdRef,
    designerScopedRows,
    draftToApply,
    propValueRows,
    slotLabels,
    setters,
    onProgress,
  } = args;
  const beforePoolKeys = designerScopedRows.map((r) => r.poolKey);
  const oldFile = await readCmsSlotDesignerSlotPropsFile(beacon.container, designerScopedRows.length);
  onProgress?.(CMS_SLOTS_ROUTE_TASK_APPLYING_COMPOSITION);
  const rebuiltRows = await applyCmsSlotCompositionDraft(beacon.container, draftToApply);
  const rebuiltMapped = draftToHiddenListIndices(rebuiltRows, draftToApply);
  const hiddenListIndicesForRuntime = rebuiltMapped.ok
    ? rebuiltMapped.indices
    : rebuiltRows.map((r) => r.domChildIndex);
  const runtimeText = serializeCmsSlotListRuntimePayload(hiddenListIndicesForRuntime, propValueRows, slotLabels);
  const newFile = mergeSlotFileAfterListRebuild(beforePoolKeys, oldFile, draftToApply);
  onProgress?.(CMS_SLOTS_ROUTE_TASK_SAVING_SLOT_CONFIG);
  await writeCmsSlotDesignerSlotPropsFile(beacon.container, newFile);
  await writeCmsSlotDesignerConfiguredPoolKeys(
    beacon.container,
    rebuiltRows.map((row) => row.poolKey)
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
    poolKey: d.poolKey,
    variant: d.variant,
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
  composerDesignerComposable: Record<string, ComposableInstancePropMeta[]>;
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
    composerDesignerComposable,
    currentCmsItemId,
    listTargetDefinitionIdRef,
    setters,
    onCompleteSideEffects,
    onProgress,
  } = input;

  onProgress?.(CMS_SLOTS_ROUTE_TASK_SAVING_COMPOSITION);

  const allowedPoolKeySet = new Set(composerAllowedPalette.map((entry) => entry.poolKey));
  const draftToApply = composerDraft.filter((row) => allowedPoolKeySet.has(row.poolKey));
  if (draftToApply.length === 0 && composerDraft.length > 0) {
    void webflow.notify({
      type: "Error",
      message: "This list only allows component types configured in Designer.",
    });
    return false;
  }

  // `ensureDesignerPoolHasDraftComponentTypes` already lists instances, resolves configured pool keys, and filters to
  // the scoped rows — computing them here first only to overwrite was a redundant full container hydration per save.
  const designerScopedRows = await ensureDesignerPoolHasDraftComponentTypes(beacon.container, draftToApply);
  const mapped = draftToHiddenListIndices(designerScopedRows, draftToApply);
  if (!mapped.ok) {
    void webflow.notify({
      type: "Error",
      message:
        "Your order uses component types that are not available in the Designer list (or not enough instances). Add them in Designer, then try again.",
    });
    return false;
  }

  const slotF = await readCmsSlotDesignerSlotPropsFile(beacon.container, designerScopedRows.length);
  const propValueRows = buildPropValueRowsForDraft({
    draftToApply,
    mapped,
    designerScopedRows,
    slotF,
    composerDesignerComposable,
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
      designerScopedRows,
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
