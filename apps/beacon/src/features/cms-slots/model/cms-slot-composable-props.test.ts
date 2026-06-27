import { describe, expect, it } from "vitest";
import {
  buildCmsSlotRuntimePropRow,
  type ComposableInstancePropMeta,
  cmsSlotPropFolder,
  cmsSlotPropSubgroupLabel,
  groupFromInstanceProp,
  mergeComposableMetaWithLiveResolved,
  normalizeHeadingTagForPayload,
  orderComposablePropsForComposer,
  pickRemappedPropValue,
} from "@/features/cms-slots/model/cms-slot-composable-props";

const E = (propId: string, label: string, valueType: string): ComposableInstancePropMeta => ({
  propId,
  label,
  valueType,
});

const M = (propId: string, label: string, group?: string): ComposableInstancePropMeta => ({
  propId,
  label,
  valueType: "string",
  group,
});

const ids = (metas: readonly ComposableInstancePropMeta[]): string[] => metas.map((m) => m.propId);

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

describe("cmsSlotPropFolder", () => {
  it("returns the segment before the first slash", () => {
    expect(cmsSlotPropFolder("Heading/Settings")).toBe("Heading");
    expect(cmsSlotPropFolder("Heading/Advanced")).toBe("Heading");
    expect(cmsSlotPropFolder("Rich Text/Advanced")).toBe("Rich Text");
  });

  it("uses only the top folder for deeper nesting", () => {
    expect(cmsSlotPropFolder("A/B/C")).toBe("A");
  });

  it("treats a slash-less group as its own folder", () => {
    expect(cmsSlotPropFolder("Content")).toBe("Content");
  });

  it("returns null for ungrouped/empty/whitespace groups", () => {
    expect(cmsSlotPropFolder(undefined)).toBeNull();
    expect(cmsSlotPropFolder("")).toBeNull();
    expect(cmsSlotPropFolder("   ")).toBeNull();
    expect(cmsSlotPropFolder("/Settings")).toBeNull();
  });
});

describe("cmsSlotPropSubgroupLabel", () => {
  it("returns everything after the first slash", () => {
    expect(cmsSlotPropSubgroupLabel("Heading/Settings")).toBe("Settings");
    expect(cmsSlotPropSubgroupLabel("A/B/C")).toBe("B/C");
  });

  it("returns null when there is no sub-group (folder header conveys it)", () => {
    expect(cmsSlotPropSubgroupLabel("Content")).toBeNull();
    expect(cmsSlotPropSubgroupLabel("Heading/")).toBeNull();
    expect(cmsSlotPropSubgroupLabel("Heading/   ")).toBeNull();
    expect(cmsSlotPropSubgroupLabel(undefined)).toBeNull();
  });
});

describe("orderComposablePropsForComposer", () => {
  it("follows Webflow panel order and clusters props by folder", () => {
    const metas = [
      M("link", "Link", "Button/Button"),
      M("textH", "Text", "Heading/Settings"),
      M("textB", "Text", "Button/Button"),
      M("visH", "Visibility", "Heading/Advanced"),
      M("visRT", "Visibility", "Rich Text/Advanced"),
      M("visB", "Visibility", "Button/Advanced"),
    ];
    const panelOrder = ["textH", "visH", "link", "textB", "visB", "visRT"];
    expect(ids(orderComposablePropsForComposer(metas, panelOrder))).toEqual([
      "textH",
      "visH",
      "link",
      "textB",
      "visB",
      "visRT",
    ]);
  });

  it("merges a folder's sub-groups even when panel order interleaves another folder", () => {
    const metas = [
      M("headingA", "Text", "Heading/Settings"),
      M("buttonX", "Link", "Button/Button"),
      M("headingB", "Visibility", "Heading/Advanced"),
    ];
    // Webflow lists Heading/Settings, then Button, then Heading/Advanced — the Heading sub-groups must rejoin.
    const panelOrder = ["headingA", "buttonX", "headingB"];
    expect(ids(orderComposablePropsForComposer(metas, panelOrder))).toEqual(["headingA", "headingB", "buttonX"]);
  });

  it("floats ungrouped props to the top, keeping their panel order", () => {
    const metas = [M("g1", "A", "Heading/Settings"), M("u1", "B"), M("g2", "C", "Heading/Advanced"), M("u2", "D")];
    const panelOrder = ["g1", "u1", "g2", "u2"];
    expect(ids(orderComposablePropsForComposer(metas, panelOrder))).toEqual(["u1", "u2", "g1", "g2"]);
  });

  it("falls back to alphabetical-by-label when no panel order is given, still clustered by folder", () => {
    const metas = [
      M("zebra", "Zebra", "Heading/Settings"),
      M("apple", "Apple", "Heading/Settings"),
      M("mango", "Mango", "Button/Button"),
    ];
    // Alpha by label: Apple, Mango, Zebra → folders in first-appearance order (Heading, then Button).
    expect(ids(orderComposablePropsForComposer(metas))).toEqual(["apple", "zebra", "mango"]);
  });

  it("sinks props missing from panel order to the end, ordered alphabetically", () => {
    const metas = [M("a", "Alpha", "Tools"), M("z", "Zed", "Tools"), M("m", "Mid", "Tools")];
    // Only `a` is ranked by panel order; `m` and `z` are unranked and fall back to alpha within the same folder.
    expect(ids(orderComposablePropsForComposer(metas, ["a"]))).toEqual(["a", "m", "z"]);
  });
});
