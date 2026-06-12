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
