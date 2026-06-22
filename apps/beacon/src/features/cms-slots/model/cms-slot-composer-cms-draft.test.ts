import { describe, expect, it } from "vitest";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  draftToHiddenListIndices,
  normalizeComposerDraftPropValues,
} from "@/features/cms-slots/model/cms-slot-composer-cms-draft";
import type { CmsSlotDesignerSlotPropsFile } from "@/features/cms-slots/model/cms-slot-designer-slot-props";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";

describe("draftToHiddenListIndices", () => {
  it("maps draft to DOM clone indices for first matching pool row", () => {
    const pool = [
      { poolKey: "a", domChildIndex: 0 },
      { poolKey: "b", domChildIndex: 2 },
      { poolKey: "a", domChildIndex: 4 },
    ];
    const r = draftToHiddenListIndices(pool, [{ poolKey: "a" }, { poolKey: "a" }, { poolKey: "b" }]);
    expect(r).toEqual({ ok: true, indices: [0, 4, 2] });
  });

  it("distinguishes variants of the same component by pool key", () => {
    const pool = [
      { poolKey: "a~left", domChildIndex: 0 },
      { poolKey: "a~right", domChildIndex: 1 },
    ];
    expect(draftToHiddenListIndices(pool, [{ poolKey: "a~right" }, { poolKey: "a~left" }])).toEqual({
      ok: true,
      indices: [1, 0],
    });
  });

  it("reuses a pool index when the draft repeats a key more times than the pool has children", () => {
    const pool = [{ poolKey: "a", domChildIndex: 1 }];
    expect(draftToHiddenListIndices(pool, [{ poolKey: "a" }, { poolKey: "a" }])).toEqual({
      ok: true,
      indices: [1, 1],
    });
  });

  it("fails when no pool child matches a draft row", () => {
    const pool = [{ poolKey: "a" }];
    expect(draftToHiddenListIndices(pool, [{ poolKey: "a" }, { poolKey: "b" }])).toEqual({ ok: false });
  });
});

describe("normalizeComposerDraftPropValues", () => {
  it("migrates legacy CMS prop keys to current searchProps ids for that slot", () => {
    const ex: ComposableInstancePropMeta[] = [{ propId: "old", label: "Title", valueType: "string" }];
    const slotProps: CmsSlotDesignerSlotPropsFile = { v: 1, slots: [{ exposed: ex }] };
    const designerRows = [
      {
        key: "k1",
        componentId: "c1",
        poolKey: "c1",
        variant: null,
        name: "C",
        instance: null as unknown as ComponentElement,
        domChildIndex: 0,
      },
    ] satisfies HydratedCmsSlotRow[];
    const live: Record<string, ComposableInstancePropMeta[]> = {
      k1: [{ propId: "new", label: "Title", valueType: "string" }],
    };
    const draft = normalizeComposerDraftPropValues(
      [{ key: "r1", componentId: "c1", poolKey: "c1", variant: null, name: "C", propValues: { old: "v1" } }],
      [0],
      designerRows,
      slotProps,
      live
    );
    expect(draft[0].propValues).toEqual({ new: "v1" });
  });
});
