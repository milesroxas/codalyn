import { describe, expect, it } from "vitest";
import {
  type BeaconLinkValue,
  beaconLinkRuntimeValue,
  decodeBeaconLinkValue,
  encodeBeaconLinkValue,
  isCmsSlotLinkValueType,
} from "@/features/cms-slots/model/cms-slot-link-value";

describe("isCmsSlotLinkValueType", () => {
  it("matches only the link valueType (scope: link props only)", () => {
    expect(isCmsSlotLinkValueType("link")).toBe(true);
    expect(isCmsSlotLinkValueType("url")).toBe(false);
    expect(isCmsSlotLinkValueType("video")).toBe(false);
  });
});

describe("decodeBeaconLinkValue", () => {
  it("decodes the canonical external-url envelope", () => {
    expect(decodeBeaconLinkValue(JSON.stringify({ k: "url", h: "https://x.com", t: 1 }))).toEqual({
      kind: "url",
      href: "https://x.com",
      newTab: true,
    });
  });

  it("decodes a page envelope keeping the stable page id", () => {
    expect(decodeBeaconLinkValue(JSON.stringify({ k: "page", h: "/about", p: "page-123" }))).toEqual({
      kind: "page",
      href: "/about",
      newTab: false,
      pageId: "page-123",
    });
  });

  it("decodes a cms envelope keeping collection + item ids", () => {
    expect(decodeBeaconLinkValue(JSON.stringify({ k: "cms", h: "/blog/post", c: "col-1", e: "item-9", t: 1 }))).toEqual(
      {
        kind: "cms",
        href: "/blog/post",
        newTab: true,
        collectionId: "col-1",
        itemId: "item-9",
      }
    );
  });

  it("accepts the wrapped-string boundary shape for href", () => {
    expect(decodeBeaconLinkValue(JSON.stringify({ k: "url", h: { value: "https://x.com" } })).href).toBe(
      "https://x.com"
    );
  });

  it("treats a legacy bare string as an external current-tab url", () => {
    expect(decodeBeaconLinkValue("https://legacy.example")).toEqual({
      kind: "url",
      href: "https://legacy.example",
      newTab: false,
    });
  });

  it("treats null / empty / whitespace as an empty external link (new-tab default)", () => {
    const empty: BeaconLinkValue = { kind: "url", href: "", newTab: true };
    expect(decodeBeaconLinkValue(null)).toEqual(empty);
    expect(decodeBeaconLinkValue(undefined)).toEqual(empty);
    expect(decodeBeaconLinkValue("")).toEqual(empty);
    expect(decodeBeaconLinkValue("   ")).toEqual(empty);
  });

  it("defaults newTab per kind when the flag is missing (external on, internal off)", () => {
    expect(decodeBeaconLinkValue(JSON.stringify({ k: "url", h: "https://x.com" })).newTab).toBe(true);
    expect(decodeBeaconLinkValue(JSON.stringify({ k: "page", h: "/x" })).newTab).toBe(false);
  });

  it("falls back to an external url for malformed json and unknown kinds", () => {
    expect(decodeBeaconLinkValue("{not json")).toEqual({ kind: "url", href: "{not json", newTab: false });
    expect(decodeBeaconLinkValue(JSON.stringify({ k: "mystery", h: "/x" })).kind).toBe("url");
  });

  it("ignores ids that belong to a different kind (matches by kind, no partial application)", () => {
    const decoded = decodeBeaconLinkValue(JSON.stringify({ k: "page", h: "/x", c: "col", e: "item" }));
    expect(decoded.collectionId).toBeUndefined();
    expect(decoded.itemId).toBeUndefined();
  });
});

describe("encodeBeaconLinkValue", () => {
  it("returns a bare string for a plain external current-tab url (legacy-compatible)", () => {
    expect(encodeBeaconLinkValue({ kind: "url", href: "https://x.com", newTab: false })).toBe("https://x.com");
  });

  it("returns '' when there is no href so the runtime falls open", () => {
    expect(encodeBeaconLinkValue({ kind: "url", href: "", newTab: true })).toBe("");
    expect(encodeBeaconLinkValue({ kind: "page", href: "   ", newTab: false, pageId: "p" })).toBe("");
  });

  it("emits a json envelope for new-tab external links", () => {
    expect(JSON.parse(encodeBeaconLinkValue({ kind: "url", href: "https://x.com", newTab: true }))).toEqual({
      k: "url",
      h: "https://x.com",
      t: 1,
    });
  });

  it("emits stable ids for page and cms links", () => {
    expect(JSON.parse(encodeBeaconLinkValue({ kind: "page", href: "/about", newTab: false, pageId: "p1" }))).toEqual({
      k: "page",
      h: "/about",
      p: "p1",
    });
    expect(
      JSON.parse(
        encodeBeaconLinkValue({ kind: "cms", href: "/blog/x", newTab: true, collectionId: "c1", itemId: "i1" })
      )
    ).toEqual({ k: "cms", h: "/blog/x", t: 1, c: "c1", e: "i1" });
  });

  it("round-trips every kind through decode → encode → decode", () => {
    const values: BeaconLinkValue[] = [
      { kind: "url", href: "https://x.com", newTab: true },
      { kind: "url", href: "https://x.com", newTab: false },
      { kind: "page", href: "/about", newTab: false, pageId: "p1" },
      { kind: "cms", href: "/blog/x", newTab: true, collectionId: "c1", itemId: "i1" },
    ];
    for (const v of values) {
      expect(decodeBeaconLinkValue(encodeBeaconLinkValue(v))).toEqual(v);
    }
  });
});

describe("beaconLinkRuntimeValue", () => {
  it("repairs a blank-href envelope to '' and canonicalizes a bare url", () => {
    expect(beaconLinkRuntimeValue(JSON.stringify({ k: "page", h: "" }))).toBe("");
    expect(beaconLinkRuntimeValue("https://x.com")).toBe("https://x.com");
  });
});
