import type { Dispatch, SetStateAction } from "react";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  type DesignerCodalynAttrSyncResult,
  syncDesignerCodalynSlotPropAttributes,
} from "@/features/cms-slots/model/cms-slot-designer-codalyn-attr-sync";
import {
  type CmsSlotDesignerSlotPropsFile,
  readAllExposedPropIdsForContainer,
  readCmsSlotDesignerSlotPropsFile,
} from "@/features/cms-slots/model/cms-slot-designer-slot-props";
import {
  cmsSlotListKey,
  filterHydratedCmsSlotRowsByPoolKeys,
  findCmsSlotListsOnPage,
  type HydratedCmsSlotRow,
  listInstancesInSlotListContainer,
  resolveCmsSlotDesignerConfiguredPoolKeys,
} from "@/features/cms-slots/model/cms-slot-page-targets";
import {
  CMS_SLOTS_DESIGNER_RESYNC_NO_FIELDS,
  CMS_SLOTS_DESIGNER_RESYNC_NOTHING_BOUND,
  CMS_SLOTS_DESIGNER_RESYNC_UP_TO_DATE,
  CMS_SLOTS_DESIGNER_RESYNC_UPDATED,
} from "@/shared/lib/cms-slots-feature-copy";
import { formatWebflowDesignerError } from "@/shared/lib/webflow-designer-error";

export type ResyncNotice = { type: "Warning" | "Success" | "Info"; message: string };

/**
 * Pool keys allowed to survive when scoping the live DOM rows for a re-tag. Unions the persisted configured keys with
 * the **live selection's** keys.
 *
 * A just-staged seed (Add component) lives in `selected` but is **not** yet written to the configured attribute — its
 * re-tag here is the commit point. Scoping by the stale attribute alone drops the staged seed, pushing `slotIndex` past
 * the end of the scoped rows: a false "slot no longer matches" error, and the seed is never committed (it lingers in the
 * Designer component list but is absent from the composer). The union is what {@link commitPendingSeedRow} persists.
 */
export function resolveResyncAllowedPoolKeys(
  configuredKeys: readonly string[],
  selected: readonly { poolKey: string }[]
): string[] {
  return [...configuredKeys, ...selected.map((row) => row.poolKey)];
}

/**
 * Decides the user-facing notice for an Apply run. Pure so the branch logic is unit-tested without the Designer.
 *
 * The key affordance: a run that changes nothing is **not** a failure when fields are already wired
 * (`matchedPropCount > 0`) — it's "already up to date". The "connect your elements" guidance is reserved for the
 * genuine case where fields are selected but nothing in the component is bound to them.
 */
export function resolveResyncNotice(r: DesignerCodalynAttrSyncResult, exposedCount: number): ResyncNotice {
  if (r.errors.length > 0) {
    return { type: "Warning", message: r.errors[0] };
  }
  if (r.tagged > 0 || r.removed > 0) {
    return { type: "Success", message: CMS_SLOTS_DESIGNER_RESYNC_UPDATED };
  }
  if (r.matchedPropCount > 0) {
    return { type: "Success", message: CMS_SLOTS_DESIGNER_RESYNC_UP_TO_DATE };
  }
  if (exposedCount > 0) {
    return { type: "Info", message: CMS_SLOTS_DESIGNER_RESYNC_NOTHING_BOUND };
  }
  return { type: "Success", message: CMS_SLOTS_DESIGNER_RESYNC_NO_FIELDS };
}

function notifyResyncOutcome(r: DesignerCodalynAttrSyncResult, exposed: ComposableInstancePropMeta[]): void {
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
 * the **other** Designer components in this slot, plus every Designer component in **other CMS slots on the page**.
 * The cross-slot ids stop a shared nested component definition (e.g. an Image used by slot A and slot B) from
 * losing one slot's segments when the other slot re-tags it (last-write-wins).
 */
async function collectForeignExposedIdsAcrossPage(
  container: BlockElement,
  sameSlotFile: CmsSlotDesignerSlotPropsFile,
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

export async function resyncDesignerSlotPropAttributesForSlotIndex(input: {
  slotIndex: number;
  selected: HydratedCmsSlotRow[];
  container: BlockElement | null;
  setResyncingDesignerSlotKey: (key: string | null) => void;
  setSelected: Dispatch<SetStateAction<HydratedCmsSlotRow[]>>;
  onProgress?: (message: string) => void;
}): Promise<boolean> {
  const { slotIndex, selected, container, setResyncingDesignerSlotKey, setSelected, onProgress } = input;
  const labelRow = selected[slotIndex];
  if (labelRow == null) {
    return false;
  }
  if (container == null) {
    return false;
  }
  setResyncingDesignerSlotKey(labelRow.key);
  try {
    const freshRows = await listInstancesInSlotListContainer(container);
    const configuredKeys = await resolveCmsSlotDesignerConfiguredPoolKeys(container, freshRows);
    const allowedKeys = resolveResyncAllowedPoolKeys(configuredKeys, selected);
    const scoped = filterHydratedCmsSlotRowsByPoolKeys(freshRows, allowedKeys);

    const row = scoped[slotIndex];
    if (row == null) {
      void webflow.notify({
        type: "Error",
        message:
          "That slot no longer matches the CMS slot list on the page. Close and reopen this list, then try tagging again.",
      });
      return false;
    }

    const f = await readCmsSlotDesignerSlotPropsFile(container, scoped.length);
    const exposed = f.slots[slotIndex]?.exposed ?? [];
    const foreignExposedIds = await collectForeignExposedIdsAcrossPage(container, f, slotIndex);

    const r = await syncDesignerCodalynSlotPropAttributes(row.instance, exposed, foreignExposedIds, onProgress);

    setSelected((prev) => mergeScopedIntoSelected(prev, scoped));
    notifyResyncOutcome(r, exposed);
    return true;
  } catch (e) {
    void webflow.notify({ type: "Error", message: formatWebflowDesignerError(e) });
    return false;
  } finally {
    setResyncingDesignerSlotKey(null);
  }
}
