import { describe, expect, it } from "vitest";
import { buildSeedPropCopyEntries, type SourcePropForCopy } from "@/features/cms-slots/model/cms-slot-seed-prop-copy";

const prop = (over: Partial<SourcePropForCopy>): SourcePropForCopy => ({
  propId: "p",
  valueType: "string",
  hasOverride: true,
  ...over,
});

describe("buildSeedPropCopyEntries", () => {
  it("copies a static override value", () => {
    const props = [prop({ propId: "title", value: { sourceType: "static", value: "Hello" } })];
    expect(buildSeedPropCopyEntries(props)).toEqual([{ propId: "title", value: "Hello" }]);
  });

  it("copies static booleans and numbers as-is", () => {
    const props = [
      prop({ propId: "on", valueType: "boolean", value: { sourceType: "static", value: true } }),
      prop({ propId: "n", valueType: "number", value: { sourceType: "static", value: 3 } }),
    ];
    expect(buildSeedPropCopyEntries(props)).toEqual([
      { propId: "on", value: true },
      { propId: "n", value: 3 },
    ]);
  });

  it("skips props with no explicit override", () => {
    const props = [prop({ propId: "title", hasOverride: false, value: { sourceType: "static", value: "x" } })];
    expect(buildSeedPropCopyEntries(props)).toEqual([]);
  });

  it("skips the variant prop (each seed pins its own)", () => {
    const props = [prop({ propId: "v", valueType: "variant", value: { sourceType: "static", value: "v-left" } })];
    expect(buildSeedPropCopyEntries(props)).toEqual([]);
  });

  it("skips a cleared/absent static value (never blanks the target)", () => {
    expect(buildSeedPropCopyEntries([prop({ value: { sourceType: "static", value: null } })])).toEqual([]);
    expect(buildSeedPropCopyEntries([prop({ value: { sourceType: "static" } })])).toEqual([]);
  });

  it("converts a prop binding to a BindingInput", () => {
    const props = [prop({ propId: "title", value: { sourceType: "prop", propId: "outer", propName: "Outer" } })];
    expect(buildSeedPropCopyEntries(props)).toEqual([
      { propId: "title", value: { sourceType: "prop", propId: "outer" } },
    ]);
  });

  it("converts a cms binding to a BindingInput", () => {
    const props = [
      prop({
        propId: "img",
        valueType: "image",
        value: { sourceType: "cms", collectionId: "col", fieldId: "fld", fieldName: "F", fieldType: "ImageRef" },
      }),
    ];
    expect(buildSeedPropCopyEntries(props)).toEqual([
      { propId: "img", value: { sourceType: "cms", collectionId: "col", fieldId: "fld" } },
    ]);
  });

  it("converts page / locale / localeItem bindings", () => {
    const props = [
      prop({ propId: "a", value: { sourceType: "page", fieldKey: "k1" } }),
      prop({ propId: "b", value: { sourceType: "locale", fieldKey: "k2" } }),
      prop({ propId: "c", value: { sourceType: "localeItem", fieldKey: "k3" } }),
    ];
    expect(buildSeedPropCopyEntries(props)).toEqual([
      { propId: "a", value: { sourceType: "page", fieldKey: "k1" } },
      { propId: "b", value: { sourceType: "locale", fieldKey: "k2" } },
      { propId: "c", value: { sourceType: "localeItem", fieldKey: "k3" } },
    ]);
  });

  it("skips conditional/legacy and malformed bindings (no partial apply)", () => {
    const props = [
      prop({ propId: "a", value: { sourceType: "conditional" } }),
      prop({ propId: "b", value: { sourceType: "legacy" } }),
      prop({ propId: "c", value: { sourceType: "prop" } }), // missing propId
      prop({ propId: "d", value: { sourceType: "cms", collectionId: "col" } }), // missing fieldId
      prop({ propId: "e", value: "not-an-object" }),
    ];
    expect(buildSeedPropCopyEntries(props)).toEqual([]);
  });
});
