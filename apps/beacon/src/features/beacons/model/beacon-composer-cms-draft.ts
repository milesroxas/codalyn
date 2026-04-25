import { fetchBeaconListCmsTextForItem } from "@/features/beacons/model/beacon-list-cms-composition-save";
import { parseBeaconListRuntimePayload } from "@/features/beacons/model/beacon-list-runtime-payload";
import {
  getBeaconListTargetCmsCollectionIdFromListContainer,
  getBeaconListTargetCmsFieldIdFromListContainer,
  getCmsTemplateCollectionIdFromCurrentPage,
} from "@/features/beacons/model/beacon-list-target-cms-text-binding";
import type { HydratedBeaconComponent } from "@/features/beacons/model/beacon-page-targets";
import type { BeaconCompositionDraftRow } from "@/features/beacons/model/site-components";
import { getTowerOrigin } from "@/shared/lib/tower-client";

export type BeaconComposerCmsSource =
  | "static_list"
  | "cms_no_item"
  | "cms_no_tower"
  | "cms_no_field"
  | "cms_field_empty"
  | "cms_from_field";

function toSignature(draft: ReadonlyArray<{ componentId: string }>): string {
  return draft.map((r) => r.componentId).join(",");
}

/**
 * Map Composer rows (in order) to indices into the **Engine** hidden list in DOM order, matching
 * `componentId` with greedy “next unused” instances so duplicate types get distinct slots.
 */
export function draftToHiddenListIndices(
  pool: ReadonlyArray<{ componentId: string }>,
  draft: ReadonlyArray<{ componentId: string }>
): { ok: true; indices: number[] } | { ok: false } {
  const used = new Set<number>();
  const indices: number[] = [];
  for (const row of draft) {
    let found = -1;
    for (let i = 0; i < pool.length; i++) {
      if (used.has(i)) {
        continue;
      }
      if (pool[i].componentId === row.componentId) {
        found = i;
        break;
      }
    }
    if (found < 0) {
      return { ok: false };
    }
    used.add(found);
    indices.push(found);
  }
  return { ok: true, indices };
}

function draftFromPayloadRows(
  engineScopedRows: readonly HydratedBeaconComponent[],
  indices: readonly number[]
): BeaconCompositionDraftRow[] {
  const out: BeaconCompositionDraftRow[] = [];
  for (const n of indices) {
    if (n < 0 || n >= engineScopedRows.length) {
      continue;
    }
    const r = engineScopedRows[n];
    if (r == null) {
      continue;
    }
    out.push({ key: crypto.randomUUID(), componentId: r.componentId, name: r.name });
  }
  return out;
}

/**
 * Resolves the Composer “target order” from the current CMS item’s **Beacon list target text** when on a
 * collection template; otherwise from the **hidden** Engine list. Empty CMS field (or no item / no Tower) ⇒
 * **empty** draft, not a copy of the canvas list.
 */
export async function resolveComposerTargetOrder(input: {
  listContainer: BlockElement;
  engineScopedRows: HydratedBeaconComponent[];
  currentCmsItemId: string | null;
}): Promise<{
  draft: BeaconCompositionDraftRow[];
  initialSignature: string;
  cmsSource: BeaconComposerCmsSource;
}> {
  const pageCollection = await getCmsTemplateCollectionIdFromCurrentPage();
  if (pageCollection == null) {
    const d = input.engineScopedRows.map((r) => ({
      key: r.key,
      componentId: r.componentId,
      name: r.name,
    }));
    return { draft: d, initialSignature: toSignature(d), cmsSource: "static_list" };
  }

  if (input.currentCmsItemId == null) {
    return { draft: [], initialSignature: "", cmsSource: "cms_no_item" };
  }

  if (getTowerOrigin().trim() === "") {
    return { draft: [], initialSignature: "", cmsSource: "cms_no_tower" };
  }

  const fromList = await getBeaconListTargetCmsCollectionIdFromListContainer(input.listContainer);
  const fieldId = await getBeaconListTargetCmsFieldIdFromListContainer(input.listContainer);
  if (fieldId == null) {
    return { draft: [], initialSignature: "", cmsSource: "cms_no_field" };
  }
  const collectionId = fromList ?? pageCollection;

  let text: string | null;
  try {
    text = await fetchBeaconListCmsTextForItem({
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
  const parsed = parseBeaconListRuntimePayload(text, input.engineScopedRows.length);
  if (parsed == null || parsed.i.length === 0) {
    return { draft: [], initialSignature: "", cmsSource: "cms_field_empty" };
  }
  const d = draftFromPayloadRows(input.engineScopedRows, parsed.i);
  if (d.length === 0) {
    return { draft: [], initialSignature: "", cmsSource: "cms_field_empty" };
  }
  return { draft: d, initialSignature: toSignature(d), cmsSource: "cms_from_field" };
}
