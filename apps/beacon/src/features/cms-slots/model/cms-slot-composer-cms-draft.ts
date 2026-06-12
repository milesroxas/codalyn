import {
  type ComposableInstancePropMeta,
  mergeComposableMetaWithLiveResolved,
  pickRemappedPropValue,
} from "@/features/cms-slots/model/cms-slot-composable-props";
import type { CmsSlotDesignerSlotPropsFile } from "@/features/cms-slots/model/cms-slot-designer-slot-props";
import { fetchCmsSlotListCmsTextForItem } from "@/features/cms-slots/model/cms-slot-list-cms-composition-save";
import {
  parseCmsSlotListRuntimePayload,
  resolveCmsSlotPublishedDisplayName,
  sanitizeSlotLabelForPayload,
} from "@/features/cms-slots/model/cms-slot-list-runtime-payload";
import {
  getCmsSlotListTargetCmsCollectionIdFromListContainer,
  getCmsSlotListTargetCmsFieldIdFromListContainer,
  getCmsTemplateCollectionIdFromCurrentPage,
} from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import {
  designerPoolIndexForRuntimeCloneIndex,
  designerRowForRuntimeCloneIndex,
  maxHiddenListDomChildIndex,
  runtimeCloneIndexForDesignerPoolIndex,
} from "@/features/cms-slots/model/cms-slot-page-targets";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";
import { getTowerOrigin } from "@/shared/lib/tower-client";

/** Prefer an unused pool slot; if the type repeats more times than slots, reuse the first matching index. */
function findHiddenListPoolIndexForRow(
  pool: ReadonlyArray<{ componentId: string }>,
  componentId: string,
  used: Set<number>
): number {
  for (let i = 0; i < pool.length; i++) {
    if (used.has(i)) {
      continue;
    }
    if (pool[i].componentId === componentId) {
      return i;
    }
  }
  for (let i = 0; i < pool.length; i++) {
    if (pool[i].componentId === componentId) {
      return i;
    }
  }
  return -1;
}

export type CmsSlotComposerCmsSource =
  | "static_list"
  | "cms_no_item"
  | "cms_no_tower"
  | "cms_no_field"
  | "cms_field_empty"
  | "cms_from_field";

/**
 * Order + per-row prop string values (Composer). Used for dirty detection vs. initial CMS/static load.
 */
export function cmsSlotCompositionSignature(draft: ReadonlyArray<CmsSlotCompositionDraftRow>): string {
  return draft
    .map((r) => {
      const pv = r.propValues ?? {};
      const keys = Object.keys(pv).sort();
      const part = keys.map((k) => `${k}:${pv[k] ?? ""}`).join("\u0001");
      const slot = sanitizeSlotLabelForPayload(r.name);
      return `${r.componentId}\u0002${part}\u0002${slot}`;
    })
    .join("\u0003");
}

/**
 * Map Composer rows (in order) to indices into the hidden list block’s **published DOM children**
 * (`sourceNode.children`), matching `componentId` with greedy “next unused” Designer instances. If the
 * draft repeats a type more times than the pool has distinct children, the **same** clone source is
 * reused (published runtime clones the same child multiple times; each row still gets its own `p[]`).
 */
export function draftToHiddenListIndices(
  pool: ReadonlyArray<{ componentId: string; domChildIndex?: number }>,
  draft: ReadonlyArray<{ componentId: string }>
): { ok: true; indices: number[] } | { ok: false } {
  const used = new Set<number>();
  const indices: number[] = [];
  for (const row of draft) {
    const found = findHiddenListPoolIndexForRow(pool, row.componentId, used);
    if (found < 0) {
      return { ok: false };
    }
    used.add(found);
    indices.push(runtimeCloneIndexForDesignerPoolIndex(pool, found));
  }
  return { ok: true, indices };
}

/**
 * Re-keys each row’s `propValues` to current Webflow `searchProps` `propId`s (aliases, label rematch, case), and drops
 * keys that no longer map to an exposed field.
 */
function normalizeComposerDraftPropRow(
  row: CmsSlotCompositionDraftRow,
  domIdx: number | undefined,
  designerRows: readonly HydratedCmsSlotRow[],
  slotProps: CmsSlotDesignerSlotPropsFile,
  liveByInstanceKey: Readonly<Record<string, ComposableInstancePropMeta[]>>
): CmsSlotCompositionDraftRow {
  if (domIdx == null || domIdx < 0) {
    return { ...row };
  }
  const eng = designerRowForRuntimeCloneIndex(designerRows, domIdx);
  if (eng == null) {
    return { ...row };
  }
  const poolI = designerPoolIndexForRuntimeCloneIndex(designerRows, domIdx);
  const rawEx = poolI >= 0 ? (slotProps.slots[poolI]?.exposed ?? []) : [];
  const { metas, aliasToCanonical } = mergeComposableMetaWithLiveResolved(rawEx, liveByInstanceKey[eng.key]);
  if (row.propValues == null || Object.keys(row.propValues).length === 0) {
    return { ...row, propValues: { ...row.propValues } };
  }
  const next: Record<string, string> = {};
  for (const ep of metas) {
    const v = pickRemappedPropValue(ep.propId, row.propValues, aliasToCanonical);
    if (v !== undefined) {
      next[ep.propId] = v;
    }
  }
  return { ...row, propValues: next };
}

export function normalizeComposerDraftPropValues(
  draft: readonly CmsSlotCompositionDraftRow[],
  runtimeDomIndexPerRow: readonly number[],
  designerRows: readonly HydratedCmsSlotRow[],
  slotProps: CmsSlotDesignerSlotPropsFile,
  liveByInstanceKey: Readonly<Record<string, ComposableInstancePropMeta[]>>
): CmsSlotCompositionDraftRow[] {
  return draft.map((row, j) =>
    normalizeComposerDraftPropRow(row, runtimeDomIndexPerRow[j], designerRows, slotProps, liveByInstanceKey)
  );
}

function draftFromPayloadRows(
  designerScopedRows: readonly HydratedCmsSlotRow[],
  indices: readonly number[],
  propRows: ReadonlyArray<Readonly<Record<string, string>>>,
  slotLabels?: readonly string[] | null
): CmsSlotCompositionDraftRow[] {
  const out: CmsSlotCompositionDraftRow[] = [];
  for (let u = 0; u < indices.length; u++) {
    const n = indices[u];
    const r = designerRowForRuntimeCloneIndex(designerScopedRows, n);
    if (r == null) {
      continue;
    }
    const pr = propRows[u] ?? {};
    const name = slotLabels != null ? resolveCmsSlotPublishedDisplayName(r.name, slotLabels[u]) : r.name;
    out.push({ key: crypto.randomUUID(), componentId: r.componentId, name, propValues: { ...pr } });
  }
  return out;
}

/**
 * Resolves the Composer “target order” from the current CMS item’s **CMS slot target text** when on a
 * collection template; otherwise from the **hidden** Designer list. Empty CMS field (or no item / no Tower) ⇒
 * **empty** draft, not a copy of the canvas list.
 */
export async function resolveComposerTargetOrder(input: {
  listContainer: BlockElement;
  designerScopedRows: HydratedCmsSlotRow[];
  currentCmsItemId: string | null;
}): Promise<{
  draft: CmsSlotCompositionDraftRow[];
  initialSignature: string;
  cmsSource: CmsSlotComposerCmsSource;
}> {
  const pageCollection = await getCmsTemplateCollectionIdFromCurrentPage();
  if (pageCollection == null) {
    const d = input.designerScopedRows.map((r) => ({
      key: r.key,
      componentId: r.componentId,
      name: r.name,
    }));
    return { draft: d, initialSignature: cmsSlotCompositionSignature(d), cmsSource: "static_list" };
  }

  if (input.currentCmsItemId == null) {
    return { draft: [], initialSignature: "", cmsSource: "cms_no_item" };
  }

  if (getTowerOrigin().trim() === "") {
    return { draft: [], initialSignature: "", cmsSource: "cms_no_tower" };
  }

  const fromList = await getCmsSlotListTargetCmsCollectionIdFromListContainer(input.listContainer);
  const fieldId = await getCmsSlotListTargetCmsFieldIdFromListContainer(input.listContainer);
  if (fieldId == null) {
    return { draft: [], initialSignature: "", cmsSource: "cms_no_field" };
  }
  const collectionId = fromList ?? pageCollection;

  let text: string | null;
  try {
    text = await fetchCmsSlotListCmsTextForItem({
      collectionId,
      fieldId,
      cmsItemId: input.currentCmsItemId,
    });
  } catch {
    return { draft: [], initialSignature: "", cmsSource: "cms_field_empty" };
  }
  if (text == null || text.trim() === "") {
    return { draft: [], initialSignature: "", cmsSource: "cms_field_empty" };
  }
  const parsed = parseCmsSlotListRuntimePayload(text, maxHiddenListDomChildIndex(input.designerScopedRows) + 1);
  if (parsed == null || parsed.i.length === 0) {
    return { draft: [], initialSignature: "", cmsSource: "cms_field_empty" };
  }
  const d = draftFromPayloadRows(input.designerScopedRows, parsed.i, parsed.p, parsed.n);
  if (d.length === 0) {
    return { draft: [], initialSignature: "", cmsSource: "cms_field_empty" };
  }
  return { draft: d, initialSignature: cmsSlotCompositionSignature(d), cmsSource: "cms_from_field" };
}
