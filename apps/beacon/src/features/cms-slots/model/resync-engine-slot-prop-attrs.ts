import type { Dispatch, SetStateAction } from "react";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  CMS_SLOT_TAG_ATTRS_DEBUG_PREFIX,
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
import { formatWebflowDesignerError, webflowDesignerErrorCauseTag } from "@/shared/lib/webflow-designer-error";

function notifyResyncOutcome(r: EngineCodalynAttrSyncResult, exposed: ComposableInstancePropMeta[]): void {
  if (r.errors.length > 0) {
    void webflow.notify({ type: "Warning", message: r.errors[0] });
    return;
  }
  if (r.tagged === 0 && r.removed === 0 && exposed.length > 0) {
    void webflow.notify({
      type: "Info",
      message:
        "No elements were tagged. Open the main component and bind headings, images, or links to the exposed props, then try again.",
    });
    return;
  }
  void webflow.notify({
    type: "Success",
    message: `Updated ${r.tagged} data attribute(s), removed ${r.removed} stale. Publish the site for the live page.`,
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
}): Promise<void> {
  const { slotIndex, selected, container, setResyncingEngineSlotKey, setSelected } = input;
  const labelRow = selected[slotIndex];
  if (labelRow == null) {
    console.log(CMS_SLOT_TAG_ATTRS_DEBUG_PREFIX, "aborted: no labelRow at slotIndex", slotIndex);
    return;
  }
  if (container == null) {
    console.log(CMS_SLOT_TAG_ATTRS_DEBUG_PREFIX, "aborted: targetRef container is null");
    return;
  }
  console.log(CMS_SLOT_TAG_ATTRS_DEBUG_PREFIX, "handleResyncEngineSlotAttrs", {
    slotIndex,
    labelRow: { componentId: labelRow.componentId, name: labelRow.name, key: labelRow.key },
  });
  setResyncingEngineSlotKey(labelRow.key);
  try {
    const freshRows = await listInstancesInSlotListContainer(container);
    const configuredIds = await resolveCmsSlotEngineConfiguredComponentIds(container, freshRows);
    const scoped = filterHydratedCmsSlotRowsByComponentIds(freshRows, configuredIds);
    console.log(CMS_SLOT_TAG_ATTRS_DEBUG_PREFIX, "canvas + engine filter", {
      freshInstancesCount: freshRows.length,
      freshInstances: freshRows.map((x) => ({ componentId: x.componentId, name: x.name })),
      configuredIds,
      scopedCount: scoped.length,
      scoped: scoped.map((x) => ({ componentId: x.componentId, name: x.name })),
    });

    const row = scoped[slotIndex];
    if (row == null) {
      console.error(CMS_SLOT_TAG_ATTRS_DEBUG_PREFIX, "scoped[slotIndex] missing — slot/UI out of sync", {
        slotIndex,
        scopedLength: scoped.length,
      });
      void webflow.notify({
        type: "Error",
        message:
          "That slot no longer matches the CMS slot list on the page. Close and reopen this list, then try tagging again.",
      });
      return;
    }

    const f = await readCmsSlotEngineSlotPropsFile(container, scoped.length);
    const exposed = f.slots[slotIndex]?.exposed ?? [];
    console.log(CMS_SLOT_TAG_ATTRS_DEBUG_PREFIX, "resolved row + exposed props", {
      rowComponentId: row.componentId,
      rowName: row.name,
      exposedPropIds: exposed.map((e) => e.propId),
    });

    const r = await syncEngineCodalynSlotPropAttributes(row.instance, exposed);
    console.log(CMS_SLOT_TAG_ATTRS_DEBUG_PREFIX, "sync result", {
      ...r,
      notifyPath:
        r.errors.length > 0
          ? "Warning (walk errors)"
          : r.tagged === 0 && r.removed === 0 && exposed.length > 0
            ? "Info (nothing tagged)"
            : "Success",
    });

    setSelected((prev) => mergeScopedIntoSelected(prev, scoped));
    notifyResyncOutcome(r, exposed);
  } catch (e) {
    console.error(CMS_SLOT_TAG_ATTRS_DEBUG_PREFIX, "handler catch (same message as Designer toast)", {
      formatted: formatWebflowDesignerError(e),
      causeTag: webflowDesignerErrorCauseTag(e),
      err: e,
    });
    void webflow.notify({ type: "Error", message: formatWebflowDesignerError(e) });
  } finally {
    setResyncingEngineSlotKey(null);
  }
}
