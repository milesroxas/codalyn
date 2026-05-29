import { describe, expect, it } from "vitest";
import {
  beaconPropPickRuntimeSource,
  CMS_SLOT_BEACON_BIND_ATTR,
  CMS_SLOT_BEACON_PROP_ATTR,
  canonicalPropIdFromBeaconPropAttrSegment,
  cmsSlotBeaconBindIdFromElement,
  formatBeaconPropAttrSegmentsForBindings,
  removeBeaconCodalynAttrsIfPresent,
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

describe("canonicalPropIdFromBeaconPropAttrSegment", () => {
  it("strips bind suffix after @", () => {
    expect(canonicalPropIdFromBeaconPropAttrSegment("hero-image@cmp-a|inner-1")).toBe("hero-image");
    expect(canonicalPropIdFromBeaconPropAttrSegment("title")).toBe("title");
  });
});

describe("formatBeaconPropAttrSegmentsForBindings", () => {
  it("suffixes duplicate exposed prop bindings with bind id", () => {
    const counts = new Map<string, number>();
    const first = formatBeaconPropAttrSegmentsForBindings(["hero-image"], "cmp-a|outer-img", counts);
    const second = formatBeaconPropAttrSegmentsForBindings(["hero-image"], "cmp-a|nested-img", counts);
    expect(first).toEqual(["hero-image"]);
    expect(second).toEqual(["hero-image@cmp-a|nested-img"]);
  });
});

describe("removeBeaconCodalynAttrsIfPresent", () => {
  it("removes both prop and bind attrs when present", async () => {
    const store = new Map<string, string>([
      [CMS_SLOT_BEACON_PROP_ATTR, "hero-image@cmp|a"],
      [CMS_SLOT_BEACON_BIND_ATTR, "cmp|a"],
    ]);
    const attr = {
      get: async (n: string) => store.get(n) ?? null,
      remove: async (n: string) => {
        store.delete(n);
        return null;
      },
    };
    await expect(removeBeaconCodalynAttrsIfPresent(attr)).resolves.toBe(2);
    expect(store.size).toBe(0);
  });

  it("returns 0 when attrs are already absent", async () => {
    const attr = {
      get: async () => null,
      remove: async () => null,
    };
    await expect(removeBeaconCodalynAttrsIfPresent(attr)).resolves.toBe(0);
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
