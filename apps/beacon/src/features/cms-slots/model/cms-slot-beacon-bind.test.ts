import { describe, expect, it } from "vitest";
import {
  beaconPropPickRuntimeSource,
  CMS_SLOT_COND_ATTR,
  CMS_SLOT_CONTENT_ATTR,
  CMS_SLOT_LEGACY_BIND_ATTR,
  canonicalPropIdFromContentAttrSegment,
  formatContentAttrSegmentsForBindings,
  mergeContentAttrSegments,
  removeCmsSlotTagAttrsIfPresent,
  removeOwnedCmsSlotTagAttrs,
  removeOwnedContentAttrSegments,
} from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";

describe("canonicalPropIdFromContentAttrSegment", () => {
  it("strips the ordinal suffix after @", () => {
    expect(canonicalPropIdFromContentAttrSegment("hero-image@2")).toBe("hero-image");
    expect(canonicalPropIdFromContentAttrSegment("title")).toBe("title");
  });
});

describe("formatContentAttrSegmentsForBindings", () => {
  it("suffixes duplicate exposed prop bindings with a delimiter-free ordinal", () => {
    const counts = new Map<string, number>();
    const first = formatContentAttrSegmentsForBindings(["hero-image"], counts);
    const second = formatContentAttrSegmentsForBindings(["hero-image"], counts);
    const third = formatContentAttrSegmentsForBindings(["hero-image"], counts);
    expect(first).toEqual(["hero-image"]);
    expect(second).toEqual(["hero-image@1"]);
    expect(third).toEqual(["hero-image@2"]);
  });
});

describe("removeCmsSlotTagAttrsIfPresent", () => {
  it("removes content, conditional, and legacy bind attrs when present", async () => {
    const store = new Map<string, string>([
      [CMS_SLOT_CONTENT_ATTR, "hero-image@1"],
      [CMS_SLOT_COND_ATTR, "1"],
      [CMS_SLOT_LEGACY_BIND_ATTR, "cmp|a"],
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

describe("mergeContentAttrSegments (shared nested component)", () => {
  it("accumulates one segment per Engine component on a shared element instead of overwriting", () => {
    // Image <img> is exposed standalone (`image`), inside Hero (`hero-image`), and inside Card (`card-image`).
    const afterStandalone = mergeContentAttrSegments({
      existing: null,
      foreignExposedIds: new Set(["hero-image", "card-image"]),
      newSegments: ["image"],
    });
    expect(afterStandalone).toEqual(["image"]);

    const afterHero = mergeContentAttrSegments({
      existing: afterStandalone.join("|"),
      foreignExposedIds: new Set(["image", "card-image"]),
      newSegments: ["hero-image"],
    });
    expect(afterHero).toEqual(["image", "hero-image"]);

    const afterCard = mergeContentAttrSegments({
      existing: afterHero.join("|"),
      foreignExposedIds: new Set(["image", "hero-image"]),
      newSegments: ["card-image"],
    });
    expect(afterCard).toEqual(["image", "hero-image", "card-image"]);
  });

  it("drops stale segments owned by no current component while preserving foreign ones", () => {
    const merged = mergeContentAttrSegments({
      existing: "hero-image|removed-image|card-image",
      foreignExposedIds: new Set(["card-image"]),
      newSegments: ["hero-image"],
    });
    expect(merged).toEqual(["card-image", "hero-image"]);
  });

  it("dedupes when this sync re-adds an already-present segment", () => {
    const merged = mergeContentAttrSegments({
      existing: "hero-image",
      foreignExposedIds: new Set(),
      newSegments: ["hero-image"],
    });
    expect(merged).toEqual(["hero-image"]);
  });
});

describe("removeOwnedContentAttrSegments", () => {
  it("removes only the owner's segments, keeping other components' (canonical match ignores the @N ordinal)", () => {
    const remaining = removeOwnedContentAttrSegments("hero-image|image@1|card-image", new Set(["image"]));
    expect(remaining).toEqual(["hero-image", "card-image"]);
  });
});

describe("removeOwnedCmsSlotTagAttrs", () => {
  function attrStore(init: Record<string, string>) {
    const store = new Map(Object.entries(init));
    return {
      store,
      ops: {
        get: async (n: string) => store.get(n) ?? null,
        set: async (n: string, v: string) => {
          store.set(n, v);
          return null;
        },
        remove: async (n: string) => {
          store.delete(n);
          return null;
        },
      },
    };
  }

  it("rewrites data-cb-c to the remaining components and keeps cond/legacy bind when segments survive", async () => {
    const { store, ops } = attrStore({
      [CMS_SLOT_CONTENT_ATTR]: "hero-image|card-image",
      [CMS_SLOT_LEGACY_BIND_ATTR]: "cmp|img",
      [CMS_SLOT_COND_ATTR]: "1",
    });
    const changed = await removeOwnedCmsSlotTagAttrs(ops, new Set(["hero-image"]));
    expect(changed).toBe(1);
    expect(store.get(CMS_SLOT_CONTENT_ATTR)).toBe("card-image");
    expect(store.get(CMS_SLOT_LEGACY_BIND_ATTR)).toBe("cmp|img");
    expect(store.get(CMS_SLOT_COND_ATTR)).toBe("1");
  });

  it("removes all tags (incl. legacy bind) when the owner held the only segment", async () => {
    const { store, ops } = attrStore({
      [CMS_SLOT_CONTENT_ATTR]: "hero-image",
      [CMS_SLOT_LEGACY_BIND_ATTR]: "cmp|img",
      [CMS_SLOT_COND_ATTR]: "1",
    });
    const changed = await removeOwnedCmsSlotTagAttrs(ops, new Set(["hero-image"]));
    expect(changed).toBe(3);
    expect(store.size).toBe(0);
  });

  it("leaves a shared element untouched when the owner has no segment here", async () => {
    const { store, ops } = attrStore({ [CMS_SLOT_CONTENT_ATTR]: "card-image", [CMS_SLOT_LEGACY_BIND_ATTR]: "cmp|img" });
    const changed = await removeOwnedCmsSlotTagAttrs(ops, new Set(["hero-image"]));
    expect(changed).toBe(0);
    expect(store.get(CMS_SLOT_CONTENT_ATTR)).toBe("card-image");
  });

  it("removes everything when owner ids are empty (legacy single-owner)", async () => {
    const { store, ops } = attrStore({
      [CMS_SLOT_CONTENT_ATTR]: "hero-image|card-image",
      [CMS_SLOT_LEGACY_BIND_ATTR]: "cmp|img",
    });
    const changed = await removeOwnedCmsSlotTagAttrs(ops, new Set());
    expect(changed).toBe(2);
    expect(store.size).toBe(0);
  });
});

describe("beaconPropPickRuntimeSource", () => {
  it("resolves @-suffixed segments via base prop id (new ordinal + legacy formats)", () => {
    const pickP = new Function(`${beaconPropPickRuntimeSource()}; return pickP;`)() as (
      ps: Record<string, string>,
      k: string
    ) => string | undefined;
    const row = { "hero-image": "https://cdn.example.com/a.avif" };
    expect(pickP(row, "hero-image@1")).toBe("https://cdn.example.com/a.avif");
    expect(pickP(row, "hero-image@cmp|nested")).toBe("https://cdn.example.com/a.avif");
    expect(pickP(row, "hero-image")).toBe("https://cdn.example.com/a.avif");
  });
});
