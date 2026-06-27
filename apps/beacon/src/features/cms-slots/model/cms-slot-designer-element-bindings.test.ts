import { describe, expect, it, vi } from "vitest";
import {
  CMS_SLOT_WEBFLOW_IMAGE_ELEMENT_TYPE,
  classAttributeBoundPropIds,
  classifyElementBindings,
  imageSearchSettingsRecord,
  isConditionalVisibilityValue,
  resolveElementBindingsSettings,
} from "@/features/cms-slots/model/cms-slot-designer-element-bindings";

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
      searchSettings: vi.fn().mockResolvedValue({}),
    } as unknown as AnyElement;

    await resolveElementBindingsSettings(el);
    expect(getSettings).toHaveBeenCalled();
  });

  it("merges link/url bindings from searchSettings on top of getSettings", async () => {
    // getSettings summaries omit the link binding; searchSettings surfaces it (same gap as images).
    const getSettings = vi.fn().mockResolvedValue({ visibility: { sourceType: "static", value: true } });
    const searchSettings = vi.fn().mockImplementation(async (opts?: { valueType?: string }) => {
      if (opts?.valueType === "link") {
        return { link: { valueType: "link", value: { sourceType: "prop", propId: "cta-link" } } };
      }
      return {};
    });
    const el = { type: "DOM", elementSettings: true, getSettings, searchSettings } as unknown as AnyElement;

    const settings = await resolveElementBindingsSettings(el);
    expect(settings?.link).toEqual({ valueType: "link", value: { sourceType: "prop", propId: "cta-link" } });
    expect(settings?.visibility).toEqual({ sourceType: "static", value: true });
    expect(searchSettings).toHaveBeenCalledWith({ valueType: "link" });
    expect(searchSettings).toHaveBeenCalledWith({ valueType: "url" });
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

describe("classAttributeBoundPropIds", () => {
  it("reads the prop id from a `class` attribute bound to a component prop (canonical shape)", () => {
    const content = {
      attributes: [{ name: "class", value: { sourceType: "prop", propId: "row-class" } }],
    };
    expect(classAttributeBoundPropIds(content)).toEqual(["row-class"]);
  });

  it("accepts the wrapped `{ value: { sourceType, propId } }` binding shape", () => {
    const content = {
      attributes: [{ name: "class", value: { value: { sourceType: "prop", propId: "row-class" } } }],
    };
    expect(classAttributeBoundPropIds(content)).toEqual(["row-class"]);
  });

  it("matches the attribute name case-insensitively and ignores non-class attributes", () => {
    const content = {
      attributes: [
        { name: "Class", value: { sourceType: "prop", propId: "themed" } },
        { name: "data-foo", value: { sourceType: "prop", propId: "other" } },
        { name: "id", value: { sourceType: "prop", propId: "ignored-id" } },
      ],
    };
    expect(classAttributeBoundPropIds(content)).toEqual(["themed"]);
  });

  it("ignores a static (string-valued) class attribute — only prop bindings are runtime work", () => {
    const content = { attributes: [{ name: "class", value: "is-static base" }] };
    expect(classAttributeBoundPropIds(content)).toEqual([]);
  });

  it("ignores a class attribute whose name itself is bound (only the literal string `class` qualifies)", () => {
    const content = {
      attributes: [{ name: { sourceType: "prop", propId: "attr-name" }, value: { sourceType: "prop", propId: "v" } }],
    };
    expect(classAttributeBoundPropIds(content)).toEqual([]);
  });

  it("ignores malformed entries and a missing/empty attributes list", () => {
    expect(classAttributeBoundPropIds({})).toEqual([]);
    expect(classAttributeBoundPropIds({ attributes: [] })).toEqual([]);
    expect(classAttributeBoundPropIds({ attributes: [null, "x", 7] as unknown[] })).toEqual([]);
    // class attr present but value carries no resolvable prop id (CMS/locale source, empty id).
    expect(
      classAttributeBoundPropIds({ attributes: [{ name: "class", value: { sourceType: "cms", fieldId: "f" } }] })
    ).toEqual([]);
    expect(
      classAttributeBoundPropIds({ attributes: [{ name: "class", value: { sourceType: "prop", propId: "" } }] })
    ).toEqual([]);
  });

  it("collects every class-bound prop when multiple class attributes resolve", () => {
    const content = {
      attributes: [
        { name: "class", value: { sourceType: "prop", propId: "a" } },
        { name: "class", value: { sourceType: "prop", propId: "b" } },
      ],
    };
    expect(classAttributeBoundPropIds(content)).toEqual(["a", "b"]);
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
