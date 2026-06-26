import { describe, expect, it } from "vitest";
import { cmsSlotListTargetCanvasLabelSuffix } from "@/features/cms-slots/model/cms-slot-list-target-designer-placeholder";

describe("cmsSlotListTargetCanvasLabelSuffix (per-slot canvas chip text)", () => {
  it("uses the user-specified display name when present", () => {
    expect(cmsSlotListTargetCanvasLabelSuffix("Hero CTA", "beacon-hero-cta")).toBe(" · Hero CTA");
  });

  it("falls back to the slug-derived label (beacon- prefix stripped) when no display name", () => {
    expect(cmsSlotListTargetCanvasLabelSuffix(null, "beacon-features")).toBe(" · features");
  });

  it("falls back when the display name is only whitespace", () => {
    expect(cmsSlotListTargetCanvasLabelSuffix("   ", "beacon-features")).toBe(" · features");
  });

  it("strips double quotes the Webflow attribute setter rejects", () => {
    expect(cmsSlotListTargetCanvasLabelSuffix('My "Quoted" Slot', "beacon-x")).toBe(" · My Quoted Slot");
  });

  it("returns the raw dataList when it carries no beacon- prefix", () => {
    expect(cmsSlotListTargetCanvasLabelSuffix(null, "legacy-list")).toBe(" · legacy-list");
  });

  it("returns an empty suffix (chip stays prefix-only) when nothing is usable", () => {
    // Quote-only display name sanitizes to empty; an empty dataList yields no fallback label either.
    expect(cmsSlotListTargetCanvasLabelSuffix('"""', "")).toBe("");
  });
});
