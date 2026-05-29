import { describe, expect, it, vi } from "vitest";
import {
  CMS_SLOT_WEBFLOW_IMAGE_ELEMENT_TYPE,
  imageSearchSettingsRecord,
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
