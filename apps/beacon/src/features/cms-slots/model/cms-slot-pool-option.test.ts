import { describe, expect, it } from "vitest";
import {
  type CmsSlotPoolOption,
  dedupePoolOptionKeys,
  parsePoolOptionKey,
  poolOptionKey,
  poolOptionsEqual,
} from "@/features/cms-slots/model/cms-slot-pool-option";

describe("poolOptionKey", () => {
  it("serializes a base/no-variant seed to the bare componentId", () => {
    expect(poolOptionKey({ componentId: "comp-a", variantId: null })).toBe("comp-a");
  });

  it("composes componentId with variantId", () => {
    expect(poolOptionKey({ componentId: "comp-a", variantId: "image-left" })).toBe("comp-a~image-left");
  });

  it("treats empty/whitespace variantId as base", () => {
    expect(poolOptionKey({ componentId: "comp-a", variantId: "" })).toBe("comp-a");
    expect(poolOptionKey({ componentId: "comp-a", variantId: "   " })).toBe("comp-a");
  });

  it("trims surrounding whitespace on both ids", () => {
    expect(poolOptionKey({ componentId: " comp-a ", variantId: " v1 " })).toBe("comp-a~v1");
  });

  it("returns empty string for a missing componentId", () => {
    expect(poolOptionKey({ componentId: "", variantId: "v1" })).toBe("");
    expect(poolOptionKey({ componentId: "   ", variantId: "v1" })).toBe("");
  });
});

describe("parsePoolOptionKey", () => {
  it("parses a bare componentId (back-compat) as the base seed", () => {
    expect(parsePoolOptionKey("comp-a")).toEqual({ componentId: "comp-a", variantId: null });
  });

  it("parses a composite key", () => {
    expect(parsePoolOptionKey("comp-a~image-right")).toEqual({ componentId: "comp-a", variantId: "image-right" });
  });

  it("returns null for empty/whitespace", () => {
    expect(parsePoolOptionKey("")).toBeNull();
    expect(parsePoolOptionKey("   ")).toBeNull();
    expect(parsePoolOptionKey(null)).toBeNull();
    expect(parsePoolOptionKey(undefined)).toBeNull();
  });

  it("returns null when componentId is missing (leading delimiter)", () => {
    expect(parsePoolOptionKey("~v1")).toBeNull();
  });

  it("normalizes a trailing/empty variant segment to base", () => {
    expect(parsePoolOptionKey("comp-a~")).toEqual({ componentId: "comp-a", variantId: null });
  });

  it("splits on the first delimiter, keeping later delimiters in the variant id", () => {
    expect(parsePoolOptionKey("comp-a~v~weird")).toEqual({ componentId: "comp-a", variantId: "v~weird" });
  });

  it("round-trips key -> option -> key", () => {
    for (const key of ["comp-a", "comp-a~v1", "x~y"]) {
      const parsed = parsePoolOptionKey(key) as CmsSlotPoolOption;
      expect(poolOptionKey(parsed)).toBe(key);
    }
  });
});

describe("poolOptionsEqual", () => {
  it("matches same component + same variant", () => {
    expect(poolOptionsEqual({ componentId: "a", variantId: "v1" }, { componentId: "a", variantId: "v1" })).toBe(true);
  });

  it("distinguishes different variants of the same component", () => {
    expect(poolOptionsEqual({ componentId: "a", variantId: "v1" }, { componentId: "a", variantId: "v2" })).toBe(false);
  });

  it("treats base seed (null) as distinct from a pinned variant", () => {
    expect(poolOptionsEqual({ componentId: "a", variantId: null }, { componentId: "a", variantId: "v1" })).toBe(false);
  });

  it("never reports two empty (invalid) options as equal", () => {
    expect(poolOptionsEqual({ componentId: "", variantId: null }, { componentId: "", variantId: null })).toBe(false);
  });
});

describe("dedupePoolOptionKeys", () => {
  it("keeps distinct variants of the same component", () => {
    expect(dedupePoolOptionKeys(["a~left", "a~right", "a~left"])).toEqual(["a~left", "a~right"]);
  });

  it("collapses base duplicates and drops blanks/invalid", () => {
    expect(dedupePoolOptionKeys(["a", "a", "", "   ", "~bad", "b"])).toEqual(["a", "b"]);
  });

  it("treats bare and explicit-base forms as the same key", () => {
    expect(dedupePoolOptionKeys(["a", "a~"])).toEqual(["a"]);
  });
});
