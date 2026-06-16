import { describe, expect, it } from "vitest";
import {
  collectExposedPropIdsFromSlotFileRaw,
  serializeSlotPropsFile,
} from "@/features/cms-slots/model/cms-slot-designer-slot-props";

describe("collectExposedPropIdsFromSlotFileRaw", () => {
  it("collects exposed prop ids across every slot, de-duplicated", () => {
    const raw = serializeSlotPropsFile({
      v: 1,
      slots: [
        { exposed: [{ propId: "hero-title", label: "Title", valueType: "Plain Text" }] },
        {
          exposed: [
            { propId: "card-image", label: "Image", valueType: "Image" },
            { propId: "hero-title", label: "Title", valueType: "Plain Text" },
          ],
        },
      ],
    });
    expect(collectExposedPropIdsFromSlotFileRaw(raw).sort()).toEqual(["card-image", "hero-title"]);
  });

  it("returns empty for missing, blank, or malformed input", () => {
    expect(collectExposedPropIdsFromSlotFileRaw(null)).toEqual([]);
    expect(collectExposedPropIdsFromSlotFileRaw("")).toEqual([]);
    expect(collectExposedPropIdsFromSlotFileRaw("   ")).toEqual([]);
    expect(collectExposedPropIdsFromSlotFileRaw("not-json")).toEqual([]);
  });

  it("ignores wrong version, non-array slots, and malformed exposed entries", () => {
    expect(collectExposedPropIdsFromSlotFileRaw(JSON.stringify({ v: 2, slots: [] }))).toEqual([]);
    expect(collectExposedPropIdsFromSlotFileRaw(JSON.stringify({ v: 1, slots: "nope" }))).toEqual([]);
    expect(
      collectExposedPropIdsFromSlotFileRaw(
        JSON.stringify({
          v: 1,
          slots: [{ exposed: [{ propId: "", label: "Empty", valueType: "Plain Text" }, { label: "No id" }] }],
        })
      )
    ).toEqual([]);
  });
});

describe("serializeSlotPropsFile (Webflow attribute encoding)", () => {
  const file = {
    v: 1 as const,
    slots: [{ exposed: [{ propId: "hero-title", label: "Title", valueType: "Plain Text" }] }],
  };

  it("never emits double quotes (Webflow setCustomAttribute rejects them)", () => {
    expect(serializeSlotPropsFile(file)).not.toContain('"');
  });

  it("round-trips through collectExposedPropIdsFromSlotFileRaw via the encoded value", () => {
    expect(collectExposedPropIdsFromSlotFileRaw(serializeSlotPropsFile(file))).toEqual(["hero-title"]);
  });

  it("preserves non-ASCII labels through encode/decode", () => {
    const unicode = {
      v: 1 as const,
      slots: [{ exposed: [{ propId: "p1", label: "Überschrift — 标题", valueType: "Plain Text" }] }],
    };
    const encoded = serializeSlotPropsFile(unicode);
    expect(encoded).not.toContain('"');
    expect(collectExposedPropIdsFromSlotFileRaw(encoded)).toEqual(["p1"]);
  });

  it("still parses legacy unencoded raw JSON values", () => {
    const legacy = JSON.stringify(file);
    expect(collectExposedPropIdsFromSlotFileRaw(legacy)).toEqual(["hero-title"]);
  });
});
