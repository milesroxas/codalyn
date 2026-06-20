import type { ExportConstraints } from "@codalyn/webflow-kit";
import { describe, expect, it } from "vitest";
import {
  collectExposedPropIdsFromSlotFileRaw,
  readCmsSlotDesignerSlotPropsFile,
  serializeSlotPropsFile,
} from "@/features/cms-slots/model/cms-slot-designer-slot-props";

const SLOT_PROPS_ATTR = "data-beacon-designer-slot-props";

function fakeContainer(serialized: string) {
  return {
    getCustomAttribute: async (name: string) => (name === SLOT_PROPS_ATTR ? serialized : null),
  } as unknown as BlockElement;
}

const VALID_EXPORT: ExportConstraints = {
  width: 1200,
  height: 800,
  exportFormat: "webp",
  maxFileSizeBytes: 500_000,
  quality: 0.8,
};

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

describe("imageExport persistence (per-prop export constraints)", () => {
  it("round-trips valid imageExport through serialize → read", async () => {
    const serialized = serializeSlotPropsFile({
      v: 1,
      slots: [{ exposed: [{ propId: "hero-img", label: "Hero", valueType: "image", imageExport: VALID_EXPORT }] }],
    });
    const parsed = await readCmsSlotDesignerSlotPropsFile(fakeContainer(serialized), 1);
    expect(parsed.slots[0].exposed[0].imageExport).toEqual(VALID_EXPORT);
  });

  it("drops a meta whose imageExport is malformed (no partial apply)", async () => {
    const serialized = serializeSlotPropsFile({
      v: 1,
      slots: [
        {
          exposed: [
            // width 0 → invalid ExportConstraints → whole meta rejected on read.
            { propId: "bad-img", label: "Bad", valueType: "image", imageExport: { ...VALID_EXPORT, width: 0 } },
            { propId: "ok-text", label: "Title", valueType: "string" },
          ],
        },
      ],
    });
    const parsed = await readCmsSlotDesignerSlotPropsFile(fakeContainer(serialized), 1);
    expect(parsed.slots[0].exposed.map((e) => e.propId)).toEqual(["ok-text"]);
  });
});
