import type { Dispatch, SetStateAction } from "react";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  type EngineCodalynAttrSyncResult,
  syncEngineCodalynSlotPropAttributes,
} from "@/features/cms-slots/model/cms-slot-engine-codalyn-attr-sync";
import {
  type CmsSlotEngineSlotPropsFile,
  readAllExposedPropIdsForContainer,
  readCmsSlotEngineSlotPropsFile,
} from "@/features/cms-slots/model/cms-slot-engine-slot-props";
import {
  cmsSlotListKey,
  filterHydratedCmsSlotRowsByComponentIds,
  findCmsSlotListsOnPage,
  type HydratedCmsSlotRow,
  listInstancesInSlotListContainer,
  resolveCmsSlotEngineConfiguredComponentIds,
} from "@/features/cms-slots/model/cms-slot-page-targets";
import {
  CMS_SLOTS_ENGINE_RESYNC_NO_FIELDS,
  CMS_SLOTS_ENGINE_RESYNC_NOTHING_BOUND,
  CMS_SLOTS_ENGINE_RESYNC_UP_TO_DATE,
  CMS_SLOTS_ENGINE_RESYNC_UPDATED,
} from "@/shared/lib/cms-slots-feature-copy";
import { formatWebflowDesignerError } from "@/shared/lib/webflow-designer-error";

export type ResyncNotice = { type: "Warning" | "Success" | "Info"; message: string };

/**
 * Decides the user-facing notice for an Apply run. Pure so the branch logic is unit-tested without the Designer.
 *
 * The key affordance: a run that changes nothing is **not** a failure when fields are already wired
 * (`matchedPropCount > 0`) — it's "already up to date". The "connect your elements" guidance is reserved for the
 * genuine case where fields are selected but nothing in the component is bound to them.
 */
export function resolveResyncNotice(r: EngineCodalynAttrSyncResult, exposedCount: number): ResyncNotice {
  if (r.errors.length > 0) {
    return { type: "Warning", message: r.errors[0] };
  }
  if (r.tagged > 0 || r.removed > 0) {
    return { type: "Success", message: CMS_SLOTS_ENGINE_RESYNC_UPDATED };
  }
  if (r.matchedPropCount > 0) {
    return { type: "Success", message: CMS_SLOTS_ENGINE_RESYNC_UP_TO_DATE };
  }
  if (exposedCount > 0) {
    return { type: "Info", message: CMS_SLOTS_ENGINE_RESYNC_NOTHING_BOUND };
  }
  return { type: "Success", message: CMS_SLOTS_ENGINE_RESYNC_NO_FIELDS };
}

function notifyResyncOutcome(r: EngineCodalynAttrSyncResult, exposed: ComposableInstancePropMeta[]): void {
  const notice = resolveResyncNotice(r, exposed.length);
  void webflow.notify(notice);
}

function mergeScopedIntoSelected(prev: HydratedCmsSlotRow[], scoped: HydratedCmsSlotRow[]): HydratedCmsSlotRow[] {
  if (prev.length !== scoped.length) {
    return scoped.map((s) => ({ ...s, key: crypto.randomUUID() }));
  }
  return scoped.map((s, i) => ({
    ...s,
    key: prev[i]?.componentId === s.componentId ? prev[i].key : crypto.randomUUID(),
  }));
}

/**
 * Exposed prop ids whose `data-cb-c` segments must be preserved while re-tagging slot `slotIndex`:
 * the **other** Engine components in this slot, plus every Engine component in **other CMS slots on the page**.
 * The cross-slot ids stop a shared nested component definition (e.g. an Image used by slot A and slot B) from
 * losing one slot's segments when the other slot re-tags it (last-write-wins).
 */
async function collectForeignExposedIdsAcrossPage(
  container: BlockElement,
  sameSlotFile: CmsSlotEngineSlotPropsFile,
  slotIndex: number
): Promise<Set<string>> {
  const ids = new Set<string>();
  sameSlotFile.slots.forEach((slot, i) => {
    if (i === slotIndex) {
      return;
    }
    for (const e of slot.exposed) {
      ids.add(e.propId);
    }
  });

  const currentKey = cmsSlotListKey(container);
  const lists = await findCmsSlotListsOnPage();
  for (const list of lists) {
    if (cmsSlotListKey(list.container) === currentKey) {
      continue;
    }
    for (const pid of await readAllExposedPropIdsForContainer(list.container)) {
      ids.add(pid);
    }
  }
  return ids;
}

export async function resyncEngineSlotPropAttributesForSlotIndex(input: {
  slotIndex: number;
  selected: HydratedCmsSlotRow[];
  container: BlockElement | null;
  setResyncingEngineSlotKey: (key: string | null) => void;
  setSelected: Dispatch<SetStateAction<HydratedCmsSlotRow[]>>;
  onProgress?: (message: string) => void;
}): Promise<boolean> {
  const { slotIndex, selected, container, setResyncingEngineSlotKey, setSelected, onProgress } = input;
  const labelRow = selected[slotIndex];
  if (labelRow == null) {
    return false;
  }
  if (container == null) {
    return false;
  }
  setResyncingEngineSlotKey(labelRow.key);
  try {
    const freshRows = await listInstancesInSlotListContainer(container);
    const configuredIds = await resolveCmsSlotEngineConfiguredComponentIds(container, freshRows);
    const scoped = filterHydratedCmsSlotRowsByComponentIds(freshRows, configuredIds);

    const row = scoped[slotIndex];
    if (row == null) {
      void webflow.notify({
        type: "Error",
        message:
          "That slot no longer matches the CMS slot list on the page. Close and reopen this list, then try tagging again.",
      });
      return false;
    }

    const f = await readCmsSlotEngineSlotPropsFile(container, scoped.length);
    const exposed = f.slots[slotIndex]?.exposed ?? [];
    const foreignExposedIds = await collectForeignExposedIdsAcrossPage(container, f, slotIndex);

    const r = await syncEngineCodalynSlotPropAttributes(row.instance, exposed, foreignExposedIds, onProgress);

    setSelected((prev) => mergeScopedIntoSelected(prev, scoped));
    notifyResyncOutcome(r, exposed);
    return true;
  } catch (e) {
    void webflow.notify({ type: "Error", message: formatWebflowDesignerError(e) });
    return false;
  } finally {
    setResyncingEngineSlotKey(null);
  }
}
