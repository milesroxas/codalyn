import { describe, expect, it, vi } from "vitest";
import {
  CMS_SLOT_WEBFLOW_IMAGE_ELEMENT_TYPE,
  classifyElementBindings,
  imageSearchSettingsRecord,
  isConditionalVisibilityValue,
  resolveElementBindingsSettings,
} from "@/features/cms-slots/model/cms-slot-engine-element-bindings";

describe("resolveElementBindingsSettings", () => {
  it("reads Image bindings from searchSettings", async () => {
    const searchSettings = vi.fn().mockImplementation(async (opts?: { valueType?: string }) => {
      if (opts?.valueType === "image") {
        return {
          main: { valueType: "image", value: { sourceType: "prop", propId: "card-img" } },
        };
      }
      return {};
    });
    const el = {
      type: CMS_SLOT_WEBFLOW_IMAGE_ELEMENT_TYPE,
      searchSettings,
    } as unknown as AnyElement;

    const settings = await resolveElementBindingsSettings(el);
    expect(settings?.main).toEqual({
      valueType: "image",
      value: { sourceType: "prop", propId: "card-img" },
    });
  });

  it("prefers getSettings when elementSettings is available", async () => {
    const getSettings = vi.fn().mockResolvedValue({ title: { sourceType: "prop", propId: "title" } });
    const el = {
      type: "DOM",
      elementSettings: true,
      getSettings,
      searchSettings: vi.fn(),
    } as unknown as AnyElement;

    await resolveElementBindingsSettings(el);
    expect(getSettings).toHaveBeenCalled();
  });

  it("returns null for nodes without binding APIs", async () => {
    const el = { type: "Block" } as unknown as AnyElement;
    await expect(resolveElementBindingsSettings(el)).resolves.toBeNull();
  });
});

describe("classifyElementBindings", () => {
  it("splits content settings from the visibility (conditional) setting", async () => {
    const getSettings = vi.fn().mockResolvedValue({
      title: { sourceType: "prop", propId: "title" },
      visibility: { sourceType: "prop", propId: "show-title" },
    });
    const el = { type: "DOM", elementSettings: true, getSettings } as unknown as AnyElement;

    const classified = await classifyElementBindings(el);
    expect(classified?.content).toEqual({ title: { sourceType: "prop", propId: "title" } });
    expect(classified?.visibility).toEqual({ sourceType: "prop", propId: "show-title" });
  });

  it("returns null for nodes without binding APIs", async () => {
    const el = { type: "Block" } as unknown as AnyElement;
    await expect(classifyElementBindings(el)).resolves.toBeNull();
  });
});

describe("isConditionalVisibilityValue", () => {
  it("treats non-static visibility bindings as conditional", () => {
    expect(isConditionalVisibilityValue({ sourceType: "prop", propId: "show" })).toBe(true);
    expect(isConditionalVisibilityValue({ sourceType: "cms" })).toBe(true);
    expect(isConditionalVisibilityValue({ sourceType: "conditional" })).toBe(true);
  });

  it("treats static or missing visibility as not conditional", () => {
    expect(isConditionalVisibilityValue({ sourceType: "static", value: true })).toBe(false);
    expect(isConditionalVisibilityValue(null)).toBe(false);
    expect(isConditionalVisibilityValue(undefined)).toBe(false);
  });
});

describe("imageSearchSettingsRecord", () => {
  it("merges typed and full searchSettings results", async () => {
    const searchSettings = vi.fn().mockImplementation(async (opts?: { valueType?: string }) => {
      if (opts?.valueType === "imageAsset") {
        return { asset: { valueType: "imageAsset", value: { sourceType: "prop", propId: "a" } } };
      }
      if (opts == null) {
        return { extra: { valueType: "image", value: { sourceType: "prop", propId: "b" } } };
      }
      return {};
    });
    const el = { searchSettings } as unknown as AnyElement;
    const merged = await imageSearchSettingsRecord(el);
    expect(merged.asset).toBeDefined();
    expect(merged.extra).toBeDefined();
  });
});
