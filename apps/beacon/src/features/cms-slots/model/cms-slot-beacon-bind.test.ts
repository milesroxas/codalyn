import { describe, expect, it } from "vitest";
import {
  beaconPropPickRuntimeSource,
  CMS_SLOT_BIND_ATTR,
  CMS_SLOT_COND_ATTR,
  CMS_SLOT_CONTENT_ATTR,
  canonicalPropIdFromContentAttrSegment,
  cmsSlotBeaconBindIdFromElement,
  formatContentAttrSegmentsForBindings,
  removeCmsSlotTagAttrsIfPresent,
} from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";

describe("cmsSlotBeaconBindIdFromElement", () => {
  it("returns component|element when ids are present", () => {
    const el = { id: { component: "cmp-a", element: "img-1" } } as unknown as AnyElement;
    expect(cmsSlotBeaconBindIdFromElement(el)).toBe("cmp-a|img-1");
  });

  it("returns null when element id is missing", () => {
    const el = { id: { component: "cmp-a" } } as unknown as AnyElement;
    expect(cmsSlotBeaconBindIdFromElement(el)).toBeNull();
  });
});

describe("canonicalPropIdFromContentAttrSegment", () => {
  it("strips bind suffix after @", () => {
    expect(canonicalPropIdFromContentAttrSegment("hero-image@cmp-a|inner-1")).toBe("hero-image");
    expect(canonicalPropIdFromContentAttrSegment("title")).toBe("title");
  });
});

describe("formatContentAttrSegmentsForBindings", () => {
  it("suffixes duplicate exposed prop bindings with bind id", () => {
    const counts = new Map<string, number>();
    const first = formatContentAttrSegmentsForBindings(["hero-image"], "cmp-a|outer-img", counts);
    const second = formatContentAttrSegmentsForBindings(["hero-image"], "cmp-a|nested-img", counts);
    expect(first).toEqual(["hero-image"]);
    expect(second).toEqual(["hero-image@cmp-a|nested-img"]);
  });
});

describe("removeCmsSlotTagAttrsIfPresent", () => {
  it("removes content, conditional, and bind attrs when present", async () => {
    const store = new Map<string, string>([
      [CMS_SLOT_CONTENT_ATTR, "hero-image@cmp|a"],
      [CMS_SLOT_COND_ATTR, "1"],
      [CMS_SLOT_BIND_ATTR, "cmp|a"],
    ]);
    const attr = {
      get: async (n: string) => store.get(n) ?? null,
      remove: async (n: string) => {
        store.delete(n);
        return null;
      },
    };
    await expect(removeCmsSlotTagAttrsIfPresent(attr)).resolves.toBe(3);
    expect(store.size).toBe(0);
  });

  it("returns 0 when attrs are already absent", async () => {
    const attr = {
      get: async () => null,
      remove: async () => null,
    };
    await expect(removeCmsSlotTagAttrsIfPresent(attr)).resolves.toBe(0);
  });
});

describe("beaconPropPickRuntimeSource", () => {
  it("resolves @bindId segments via base prop id", () => {
    const pickP = new Function(`${beaconPropPickRuntimeSource()}; return pickP;`)() as (
      ps: Record<string, string>,
      k: string
    ) => string | undefined;
    const row = { "hero-image": "https://cdn.example.com/a.avif" };
    expect(pickP(row, "hero-image@cmp|nested")).toBe("https://cdn.example.com/a.avif");
    expect(pickP(row, "hero-image")).toBe("https://cdn.example.com/a.avif");
  });
});
