import { describe, expect, it } from "vitest";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  draftToHiddenListIndices,
  normalizeComposerDraftPropValues,
} from "@/features/cms-slots/model/cms-slot-composer-cms-draft";
import type { CmsSlotEngineSlotPropsFile } from "@/features/cms-slots/model/cms-slot-engine-slot-props";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";

describe("draftToHiddenListIndices", () => {
  it("maps draft to first matching instance per row in pool order", () => {
    const pool = [{ componentId: "a" }, { componentId: "b" }, { componentId: "a" }];
    const r = draftToHiddenListIndices(pool, [{ componentId: "a" }, { componentId: "a" }, { componentId: "b" }]);
    expect(r).toEqual({ ok: true, indices: [0, 2, 1] });
  });

  it("reuses a pool index when the draft repeats a type more times than the pool has children", () => {
    const pool = [{ componentId: "a" }];
    expect(draftToHiddenListIndices(pool, [{ componentId: "a" }, { componentId: "a" }])).toEqual({
      ok: true,
      indices: [0, 0],
    });
  });

  it("fails when no pool child matches a draft row", () => {
    const pool = [{ componentId: "a" }];
    expect(draftToHiddenListIndices(pool, [{ componentId: "a" }, { componentId: "b" }])).toEqual({ ok: false });
  });
});

describe("normalizeComposerDraftPropValues", () => {
  it("migrates legacy CMS prop keys to current searchProps ids for that slot", () => {
    const ex: ComposableInstancePropMeta[] = [{ propId: "old", label: "Title", valueType: "string" }];
    const slotProps: CmsSlotEngineSlotPropsFile = { v: 1, slots: [{ exposed: ex }] };
    const engineRows = [
      { key: "k1", componentId: "c1", name: "C", instance: null as unknown as ComponentElement },
    ] satisfies HydratedCmsSlotRow[];
    const live: Record<string, ComposableInstancePropMeta[]> = {
      k1: [{ propId: "new", label: "Title", valueType: "string" }],
    };
    const draft = normalizeComposerDraftPropValues(
      [{ key: "r1", componentId: "c1", name: "C", propValues: { old: "v1" } }],
      [0],
      engineRows,
      slotProps,
      live
    );
    expect(draft[0].propValues).toEqual({ new: "v1" });
  });
});
