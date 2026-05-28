import { describe, expect, it } from "vitest";
import { cmsSlotHasComposerReadyEngineComponent } from "@/features/cms-slots/model/cms-slot-composer-eligible";
import type { CmsSlotEngineSlotPropsFile } from "@/features/cms-slots/model/cms-slot-engine-slot-props";

describe("cmsSlotHasComposerReadyEngineComponent", () => {
  const slotPropsWithExpose: CmsSlotEngineSlotPropsFile = {
    v: 1,
    slots: [{ exposed: [{ propId: "title", label: "Title", valueType: "Text" }] }],
  };

  it("is false when Engine palette is unset", () => {
    expect(
      cmsSlotHasComposerReadyEngineComponent({
        configuredComponentIds: null,
        scopedRowCount: 1,
        slotProps: slotPropsWithExpose,
      })
    ).toBe(false);
    expect(
      cmsSlotHasComposerReadyEngineComponent({
        configuredComponentIds: [],
        scopedRowCount: 1,
        slotProps: slotPropsWithExpose,
      })
    ).toBe(false);
  });

  it("is false when configured palette has no matching hidden-list rows", () => {
    expect(
      cmsSlotHasComposerReadyEngineComponent({
        configuredComponentIds: ["comp-1"],
        scopedRowCount: 0,
        slotProps: slotPropsWithExpose,
      })
    ).toBe(false);
  });

  it("is false when no slot exposes Composer props", () => {
    expect(
      cmsSlotHasComposerReadyEngineComponent({
        configuredComponentIds: ["comp-1"],
        scopedRowCount: 1,
        slotProps: { v: 1, slots: [{ exposed: [] }] },
      })
    ).toBe(false);
  });

  it("is true when at least one Engine slot exposes props", () => {
    expect(
      cmsSlotHasComposerReadyEngineComponent({
        configuredComponentIds: ["comp-1"],
        scopedRowCount: 1,
        slotProps: slotPropsWithExpose,
      })
    ).toBe(true);
  });
});
