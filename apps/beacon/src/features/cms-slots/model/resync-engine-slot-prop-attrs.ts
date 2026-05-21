import type { Dispatch, SetStateAction } from "react";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  type EngineCodalynAttrSyncResult,
  syncEngineCodalynSlotPropAttributes,
} from "@/features/cms-slots/model/cms-slot-engine-codalyn-attr-sync";
import { readCmsSlotEngineSlotPropsFile } from "@/features/cms-slots/model/cms-slot-engine-slot-props";
import {
  filterHydratedCmsSlotRowsByComponentIds,
  type HydratedCmsSlotRow,
  listInstancesInSlotListContainer,
  resolveCmsSlotEngineConfiguredComponentIds,
} from "@/features/cms-slots/model/cms-slot-page-targets";
import { formatWebflowDesignerError } from "@/shared/lib/webflow-designer-error";

function notifyResyncOutcome(r: EngineCodalynAttrSyncResult, exposed: ComposableInstancePropMeta[]): void {
  if (r.errors.length > 0) {
    void webflow.notify({ type: "Warning", message: r.errors[0] });
    return;
  }
  if (r.tagged === 0 && r.removed === 0 && exposed.length > 0) {
    void webflow.notify({
      type: "Info",
      message:
        "No elements were tagged. Bind elements to component props, wire nested instances to exposed parent props, then try again.",
    });
    return;
  }
  void webflow.notify({
    type: "Success",
    message: `Updated ${r.tagged} data attribute(s), removed ${r.removed} stale${
      r.publishPlaceholdersSeeded > 0 ? `, seeded ${r.publishPlaceholdersSeeded} publish placeholder(s)` : ""
    }. Publish the site for the live page.`,
  });
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

export async function resyncEngineSlotPropAttributesForSlotIndex(input: {
  slotIndex: number;
  selected: HydratedCmsSlotRow[];
  container: BlockElement | null;
  setResyncingEngineSlotKey: (key: string | null) => void;
  setSelected: Dispatch<SetStateAction<HydratedCmsSlotRow[]>>;
}): Promise<boolean> {
  const { slotIndex, selected, container, setResyncingEngineSlotKey, setSelected } = input;
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

    const r = await syncEngineCodalynSlotPropAttributes(row.instance, exposed);

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
