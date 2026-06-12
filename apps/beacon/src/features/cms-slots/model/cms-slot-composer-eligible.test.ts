import { describe, expect, it } from "vitest";
import { cmsSlotHasComposerReadyDesignerComponent } from "@/features/cms-slots/model/cms-slot-composer-eligible";
import type { CmsSlotDesignerSlotPropsFile } from "@/features/cms-slots/model/cms-slot-designer-slot-props";

describe("cmsSlotHasComposerReadyDesignerComponent", () => {
  const slotPropsWithExpose: CmsSlotDesignerSlotPropsFile = {
    v: 1,
    slots: [{ exposed: [{ propId: "title", label: "Title", valueType: "Text" }] }],
  };

  it("is false when Designer palette is unset", () => {
    expect(
      cmsSlotHasComposerReadyDesignerComponent({
        configuredComponentIds: null,
        scopedRowCount: 1,
        slotProps: slotPropsWithExpose,
      })
    ).toBe(false);
    expect(
      cmsSlotHasComposerReadyDesignerComponent({
        configuredComponentIds: [],
        scopedRowCount: 1,
        slotProps: slotPropsWithExpose,
      })
    ).toBe(false);
  });

  it("is false when configured palette has no matching hidden-list rows", () => {
    expect(
      cmsSlotHasComposerReadyDesignerComponent({
        configuredComponentIds: ["comp-1"],
        scopedRowCount: 0,
        slotProps: slotPropsWithExpose,
      })
    ).toBe(false);
  });

  it("is false when no slot exposes Composer props", () => {
    expect(
      cmsSlotHasComposerReadyDesignerComponent({
        configuredComponentIds: ["comp-1"],
        scopedRowCount: 1,
        slotProps: { v: 1, slots: [{ exposed: [] }] },
      })
    ).toBe(false);
  });

  it("is true when at least one Designer slot exposes props", () => {
    expect(
      cmsSlotHasComposerReadyDesignerComponent({
        configuredComponentIds: ["comp-1"],
        scopedRowCount: 1,
        slotProps: slotPropsWithExpose,
      })
    ).toBe(true);
  });
});
