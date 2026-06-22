import { describe, expect, it } from "vitest";
import {
  type InstancePropForVariant,
  poolOptionLabel,
  readSelectedVariantFromInstanceProps,
  readVariantControlFromInstanceProps,
} from "@/features/cms-slots/model/cms-slot-instance-variant";

const OPTIONS = [
  { id: "v-left", name: "Image Left" },
  { id: "v-right", name: "Image Right" },
];

const variantProp = (over: Partial<InstancePropForVariant>): InstancePropForVariant => ({
  propId: "variant-prop",
  valueType: "variant",
  display: { options: OPTIONS },
  ...over,
});

describe("readSelectedVariantFromInstanceProps", () => {
  it("reads the selection from a static prop value (canonical shape)", () => {
    const props = [variantProp({ value: { sourceType: "static", value: "v-right" } })];
    expect(readSelectedVariantFromInstanceProps(props)).toEqual({
      propId: "variant-prop",
      variantId: "v-right",
      variantName: "Image Right",
    });
  });

  it("reads a bare primitive value (alternate shape)", () => {
    expect(readSelectedVariantFromInstanceProps([variantProp({ value: "v-left" })])).toEqual({
      propId: "variant-prop",
      variantId: "v-left",
      variantName: "Image Left",
    });
  });

  it("reads a singly-wrapped value (alternate shape)", () => {
    expect(readSelectedVariantFromInstanceProps([variantProp({ value: { value: "v-left" } })])).toEqual({
      propId: "variant-prop",
      variantId: "v-left",
      variantName: "Image Left",
    });
  });

  it("falls back to resolvedValue, then defaultValue", () => {
    expect(readSelectedVariantFromInstanceProps([variantProp({ resolvedValue: "v-right" })])?.variantId).toBe(
      "v-right"
    );
    expect(readSelectedVariantFromInstanceProps([variantProp({ defaultValue: "v-left" })])?.variantId).toBe("v-left");
  });

  it("matches option id case-insensitively but never by label", () => {
    expect(readSelectedVariantFromInstanceProps([variantProp({ value: "V-RIGHT" })])?.variantId).toBe("v-right");
    // A value equal to an option NAME (not its id) is rejected.
    expect(readSelectedVariantFromInstanceProps([variantProp({ value: "Image Right" })])).toBeNull();
  });

  it("returns null for the base variant / no override", () => {
    expect(readSelectedVariantFromInstanceProps([variantProp({ value: "base" })])).toBeNull();
    expect(readSelectedVariantFromInstanceProps([variantProp({})])).toBeNull();
  });

  it("returns null when no variant prop is present", () => {
    const props: InstancePropForVariant[] = [{ propId: "title", valueType: "string", value: "hi" }];
    expect(readSelectedVariantFromInstanceProps(props)).toBeNull();
  });

  it("returns null when the variant prop has no defined options", () => {
    expect(
      readSelectedVariantFromInstanceProps([variantProp({ display: { options: [] }, value: "v-left" })])
    ).toBeNull();
  });

  it("returns null when the stored selection matches no option (no invented fallback)", () => {
    expect(readSelectedVariantFromInstanceProps([variantProp({ value: "v-gone" })])).toBeNull();
  });

  it("falls back to the option id when the option has no name", () => {
    const props = [variantProp({ display: { options: [{ id: "v-x" }] }, value: "v-x" })];
    expect(readSelectedVariantFromInstanceProps(props)).toEqual({
      propId: "variant-prop",
      variantId: "v-x",
      variantName: "v-x",
    });
  });

  it("uses the first variant prop with a valid selection", () => {
    const props = [
      variantProp({ propId: "theme", display: { options: [{ id: "dark", name: "Dark" }] }, value: "dark" }),
      variantProp({ propId: "size", value: "v-right" }),
    ];
    expect(readSelectedVariantFromInstanceProps(props)).toEqual({
      propId: "theme",
      variantId: "dark",
      variantName: "Dark",
    });
  });
});

describe("readVariantControlFromInstanceProps", () => {
  it("returns propId, base-prepended options, and the current selection", () => {
    const props = [variantProp({ value: "v-right" })];
    expect(readVariantControlFromInstanceProps(props)).toEqual({
      propId: "variant-prop",
      options: [
        { id: "base", name: "Base" },
        { id: "v-left", name: "Image Left" },
        { id: "v-right", name: "Image Right" },
      ],
      selectedId: "v-right",
    });
  });

  it("reports base as the selection when on base / unset", () => {
    expect(readVariantControlFromInstanceProps([variantProp({})])?.selectedId).toBe("base");
    expect(readVariantControlFromInstanceProps([variantProp({ value: "base" })])?.selectedId).toBe("base");
  });

  it("does not duplicate a base option already defined by Webflow", () => {
    const props = [
      variantProp({
        display: {
          options: [
            { id: "base", name: "Base" },
            { id: "v-left", name: "Image Left" },
          ],
        },
        value: "v-left",
      }),
    ];
    const control = readVariantControlFromInstanceProps(props);
    expect(control?.options.filter((o) => o.id === "base")).toHaveLength(1);
    expect(control?.options).toEqual([
      { id: "base", name: "Base" },
      { id: "v-left", name: "Image Left" },
    ]);
  });

  it("returns null when the component has no variant prop", () => {
    expect(readVariantControlFromInstanceProps([{ propId: "title", valueType: "string", value: "hi" }])).toBeNull();
  });
});

describe("poolOptionLabel", () => {
  it("returns the component name for a base seed", () => {
    expect(poolOptionLabel("Split Content", null)).toBe("Split Content");
  });

  it("appends the variant name for a pinned seed", () => {
    expect(poolOptionLabel("Split Content", { propId: "p", variantId: "v-left", variantName: "Image Left" })).toBe(
      "Split Content · Image Left"
    );
  });
});
