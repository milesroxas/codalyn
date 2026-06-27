import { describe, expect, it } from "vitest";
import { CMS_SLOT_PUBLISH_PLACEHOLDER_URL } from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import {
  buildCmsSlotRuntimePropRow,
  type ComposableInstancePropMeta,
  groupFromInstanceProp,
  mergeComposableMetaWithLiveResolved,
  normalizeHeadingTagForPayload,
  pickRemappedPropValue,
  staticDefaultFromInstanceProp,
} from "@/features/cms-slots/model/cms-slot-composable-props";

const E = (propId: string, label: string, valueType: string): ComposableInstancePropMeta => ({
  propId,
  label,
  valueType,
});

describe("groupFromInstanceProp", () => {
  it("returns the group string when present", () => {
    expect(groupFromInstanceProp({ display: { label: "CTA", group: "Content" } })).toBe("Content");
  });

  it("treats null/empty/whitespace group as ungrouped", () => {
    expect(groupFromInstanceProp({ display: { label: "CTA", group: null } })).toBeUndefined();
    expect(groupFromInstanceProp({ display: { label: "CTA", group: "" } })).toBeUndefined();
    expect(groupFromInstanceProp({ display: { label: "CTA", group: "   " } })).toBeUndefined();
  });
});

describe("mergeComposableMetaWithLiveResolved", () => {
  it("matches by propId with case differences", () => {
    const exposed = [E("AbCdEf", "Title", "string")];
    const live = [E("abcdef", "Title", "string")];
    const { metas, aliasToCanonical } = mergeComposableMetaWithLiveResolved(exposed, live);
    expect(metas[0].propId).toBe("abcdef");
    expect(aliasToCanonical.get("AbCdEf")).toBe("abcdef");
  });

  it("rebinds by label+valueType when id disappeared", () => {
    const exposed = [E("old-internal-id", "Headline", "string")];
    const live = [E("new-internal-id", "Headline", "string")];
    const { metas, aliasToCanonical } = mergeComposableMetaWithLiveResolved(exposed, live);
    expect(metas[0].propId).toBe("new-internal-id");
    expect(aliasToCanonical.get("old-internal-id")).toBe("new-internal-id");
  });

  it("does not guess when two live props share label+valueType", () => {
    const exposed = [E("gone", "Status", "string")];
    const live = [E("a", "Status", "string"), E("b", "Status", "string")];
    const { metas, aliasToCanonical } = mergeComposableMetaWithLiveResolved(exposed, live);
    expect(metas[0].propId).toBe("gone");
    expect(aliasToCanonical.get("gone")).toBe("gone");
  });
});

describe("staticDefaultFromInstanceProp", () => {
  it("reads a Designer-set static string value (e.g. an icon class)", () => {
    expect(
      staticDefaultFromInstanceProp({ valueType: "string", value: { sourceType: "static", value: "ph-feather" } })
    ).toBe("ph-feather");
  });

  it("falls back to the component defaultValue when there is no instance override", () => {
    expect(
      staticDefaultFromInstanceProp({ valueType: "string", value: null as unknown, defaultValue: "ph-star" })
    ).toBe("ph-star");
  });

  it("stringifies primitive number / boolean statics", () => {
    expect(staticDefaultFromInstanceProp({ valueType: "number", value: { sourceType: "static", value: 3 } })).toBe("3");
    // boolean valueType itself is skipped, but a non-boolean prop carrying a boolean static still stringifies.
    expect(staticDefaultFromInstanceProp({ valueType: "string", value: { sourceType: "static", value: true } })).toBe(
      "true"
    );
  });

  it("returns undefined for bindings, empty, complex, and publish-placeholder values", () => {
    expect(
      staticDefaultFromInstanceProp({ valueType: "string", value: { sourceType: "prop", propId: "x" } as unknown })
    ).toBeUndefined();
    expect(
      staticDefaultFromInstanceProp({ valueType: "string", value: { sourceType: "static", value: "   " } })
    ).toBeUndefined();
    expect(
      staticDefaultFromInstanceProp({ valueType: "string", value: { sourceType: "static", value: { url: "/x" } } })
    ).toBeUndefined();
    expect(
      staticDefaultFromInstanceProp({
        valueType: "image",
        value: { sourceType: "static", value: CMS_SLOT_PUBLISH_PLACEHOLDER_URL },
      })
    ).toBeUndefined();
  });

  it("skips value types where empty has its own meaning (visibility, boolean, variant)", () => {
    for (const valueType of ["visibility", "boolean", "variant"]) {
      expect(
        staticDefaultFromInstanceProp({ valueType, value: { sourceType: "static", value: "true" } })
      ).toBeUndefined();
    }
  });
});

describe("buildCmsSlotRuntimePropRow seed-default fallback", () => {
  it("uses the meta defaultValue when the Composer value is empty/absent", () => {
    const metas: ComposableInstancePropMeta[] = [
      { propId: "icon", label: "Icon", valueType: "string", defaultValue: "ph-feather" },
    ];
    // absent in propValues → default applies
    expect(buildCmsSlotRuntimePropRow({ propValues: {} }, metas, new Map())).toEqual({ icon: "ph-feather" });
    // present-but-empty → default applies
    expect(buildCmsSlotRuntimePropRow({ propValues: { icon: "" } }, metas, new Map())).toEqual({ icon: "ph-feather" });
  });

  it("lets an explicit Composer value win over the seed default", () => {
    const metas: ComposableInstancePropMeta[] = [
      { propId: "icon", label: "Icon", valueType: "string", defaultValue: "ph-feather" },
    ];
    expect(buildCmsSlotRuntimePropRow({ propValues: { icon: "ph-star" } }, metas, new Map())).toEqual({
      icon: "ph-star",
    });
  });

  it("emits empty when there is neither a Composer value nor a default", () => {
    const metas = [E("icon", "Icon", "string")];
    expect(buildCmsSlotRuntimePropRow({ propValues: {} }, metas, new Map())).toEqual({ icon: "" });
  });
});

describe("normalizeHeadingTagForPayload", () => {
  it("maps option id via Webflow option label to h1..h6", () => {
    const opts = [
      { value: "wf-h1", label: "Heading 1" },
      { value: "wf-h3", label: "H3" },
    ];
    expect(normalizeHeadingTagForPayload("wf-h1", opts)).toBe("h1");
    expect(normalizeHeadingTagForPayload("wf-h3", opts)).toBe("h3");
  });

  it("accepts h1..h6 and single-digit levels", () => {
    expect(normalizeHeadingTagForPayload("H1", undefined)).toBe("h1");
    expect(normalizeHeadingTagForPayload("3", undefined)).toBe("h3");
  });
});

describe("pickRemappedPropValue + buildCmsSlotRuntimePropRow", () => {
  it("resolves values from legacy keys and emits every exposed id", () => {
    const live = [E("new-id", "Headline", "string")];
    const { metas, aliasToCanonical } = mergeComposableMetaWithLiveResolved([E("old-id", "Headline", "string")], live);
    const values = { "old-id": "hello" };
    expect(pickRemappedPropValue("new-id", values, aliasToCanonical)).toBe("hello");
    const row = buildCmsSlotRuntimePropRow({ propValues: values }, metas, aliasToCanonical);
    expect(row).toEqual({ "new-id": "hello" });
  });

  it("picks by case-only variant in stored JSON", () => {
    const { metas, aliasToCanonical } = mergeComposableMetaWithLiveResolved(
      [E("X", "L", "string")],
      [E("x", "L", "string")]
    );
    const v = pickRemappedPropValue("x", { X: "v" }, aliasToCanonical);
    expect(v).toBe("v");
    const row = buildCmsSlotRuntimePropRow({ propValues: { X: "v" } }, metas, aliasToCanonical);
    expect(row).toEqual({ x: "v" });
  });

  it("normalizes headingTag values in the runtime row using merged select options", () => {
    const exposed: ComposableInstancePropMeta[] = [
      {
        propId: "tag",
        label: "Level",
        valueType: "headingTag",
        selectOptions: [
          { value: "opt-h1", label: "Heading 1" },
          { value: "opt-h3", label: "Heading 3" },
        ],
      },
    ];
    const { metas, aliasToCanonical } = mergeComposableMetaWithLiveResolved(exposed, exposed);
    expect(buildCmsSlotRuntimePropRow({ propValues: { tag: "opt-h1" } }, metas, aliasToCanonical)).toEqual({
      tag: "h1",
    });
    expect(buildCmsSlotRuntimePropRow({ propValues: { tag: "h2" } }, metas, aliasToCanonical)).toEqual({
      tag: "h2",
    });
  });

  it("canonicalizes link prop values into the runtime row", () => {
    const exposed = [{ propId: "cta", label: "CTA", valueType: "link" }];
    const { metas, aliasToCanonical } = mergeComposableMetaWithLiveResolved(exposed, exposed);
    // Plain external current-tab link stays a bare url.
    expect(buildCmsSlotRuntimePropRow({ propValues: { cta: "https://x.com" } }, metas, aliasToCanonical)).toEqual({
      cta: "https://x.com",
    });
    // A link envelope with no href collapses to "" so the runtime falls open to the authored default.
    expect(
      buildCmsSlotRuntimePropRow({ propValues: { cta: JSON.stringify({ k: "page", h: "" }) } }, metas, aliasToCanonical)
    ).toEqual({ cta: "" });
  });
});
