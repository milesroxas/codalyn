import { describe, expect, it, vi } from "vitest";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  CMS_SLOT_PUBLISH_PLACEHOLDER_URL,
  isHiddenListInstancePropEmpty,
  isSearchInstancePropEmpty,
  needsParentSeedForNestedTaggedCanonical,
  publishPlaceholderForExposedProp,
  publishPlaceholderForValueType,
  resolveSeedPlaceholderValue,
  seedHiddenListPublishPlaceholders,
  seedNestedPublishPlaceholdersOnPlacedInstance,
} from "@/features/cms-slots/model/cms-slot-hidden-list-publish-placeholders";

const linkMeta: ComposableInstancePropMeta = { propId: "cta-link", label: "Link", valueType: "link" };
const linkPlaceholder = { mode: "url", to: CMS_SLOT_PUBLISH_PLACEHOLDER_URL } as const;

describe("isHiddenListInstancePropEmpty", () => {
  it("treats unset link props as empty", () => {
    expect(isHiddenListInstancePropEmpty({ value: null }, "link")).toBe(true);
    expect(isHiddenListInstancePropEmpty({ value: { mode: "url", to: "" } }, "link")).toBe(true);
  });

  it("treats conditional bindings as empty (needs publish placeholder)", () => {
    expect(isHiddenListInstancePropEmpty({ value: { sourceType: "conditional" } }, "link")).toBe(true);
  });

  it("treats active bindings as non-empty", () => {
    expect(
      isHiddenListInstancePropEmpty(
        { value: { sourceType: "prop", propId: "x", propName: "X", propGroup: null } },
        "link"
      )
    ).toBe(false);
  });

  it("treats link with destination as set", () => {
    expect(isHiddenListInstancePropEmpty({ value: { mode: "url", to: "https://a.test" } }, "link")).toBe(false);
  });
});

describe("isSearchInstancePropEmpty", () => {
  it("uses resolvedValue from searchProps", () => {
    expect(
      isSearchInstancePropEmpty({
        valueType: "link",
        value: { sourceType: "static", value: null },
        resolvedValue: null,
      })
    ).toBe(true);
    expect(
      isSearchInstancePropEmpty({
        valueType: "link",
        value: { sourceType: "static", value: linkPlaceholder },
        resolvedValue: linkPlaceholder,
      })
    ).toBe(false);
  });
});

describe("publishPlaceholderForValueType", () => {
  it("uses a Webflow link object for link props", () => {
    expect(publishPlaceholderForValueType("link")).toEqual(linkPlaceholder);
    expect(publishPlaceholderForExposedProp(linkMeta)).toEqual(linkPlaceholder);
  });

  it("uses a plain string for url props", () => {
    expect(publishPlaceholderForValueType("url")).toBe(CMS_SLOT_PUBLISH_PLACEHOLDER_URL);
  });

  it("does not use a URL string for imageAsset setProps", () => {
    expect(publishPlaceholderForValueType("imageAsset")).toBe("\u00a0");
    expect(resolveSeedPlaceholderValue("imageAsset", "asset-123")).toBe("asset-123");
    expect(resolveSeedPlaceholderValue("imageAsset", null)).toBeNull();
  });
});

describe("needsParentSeedForNestedTaggedCanonical", () => {
  it("seeds parent exposed props with component link defaults (#)", () => {
    expect(
      needsParentSeedForNestedTaggedCanonical(
        {
          valueType: "link",
          value: { sourceType: "static", value: { mode: "url", to: "#" } },
          resolvedValue: { mode: "url", to: "#" },
        },
        linkMeta
      )
    ).toBe(true);
  });

  it("seeds empty parent exposed props", () => {
    expect(
      needsParentSeedForNestedTaggedCanonical(
        {
          valueType: "link",
          value: { sourceType: "static", value: null },
          resolvedValue: null,
        },
        linkMeta
      )
    ).toBe(true);
  });

  it("skips parent props that already have the publish placeholder", () => {
    expect(
      needsParentSeedForNestedTaggedCanonical(
        {
          valueType: "link",
          value: { sourceType: "static", value: linkPlaceholder },
          resolvedValue: linkPlaceholder,
        },
        linkMeta
      )
    ).toBe(false);
  });

  it("skips parent props with real content", () => {
    expect(
      needsParentSeedForNestedTaggedCanonical(
        {
          valueType: "string",
          value: { sourceType: "static", value: "Lorem ipsum" },
          resolvedValue: "Lorem ipsum",
        },
        { valueType: "string" }
      )
    ).toBe(false);
  });
});

describe("seedNestedPublishPlaceholdersOnPlacedInstance", () => {
  it("sets placeholders on the parent list-row instance using exposed prop ids", async () => {
    vi.stubGlobal("webflow", {
      getCurrentComponent: vi.fn().mockResolvedValue(null),
      exitComponent: vi.fn().mockResolvedValue(undefined),
    });
    const setProps = vi.fn().mockResolvedValue([]);
    const parentInstance = {
      searchProps: vi.fn().mockResolvedValue([
        {
          propId: "cta-link",
          valueType: "link",
          hasOverride: false,
          value: { sourceType: "static", value: { mode: "url", to: "#" } },
          resolvedValue: { mode: "url", to: "#" },
          defaultValue: null,
          display: { label: "Link", group: null },
        },
      ]),
      setProps,
      getComponent: vi.fn().mockResolvedValue({ id: "card-primary" }),
    } as unknown as ComponentElement;

    const n = await seedNestedPublishPlaceholdersOnPlacedInstance(
      parentInstance,
      [linkMeta],
      new Set(["cta-link"]),
      new Set(["nested-link|cta-link"])
    );
    expect(n).toBe(1);
    expect(setProps).toHaveBeenCalledWith([{ propId: "cta-link", value: linkPlaceholder }]);
    vi.unstubAllGlobals();
  });

  it("matches nested seed pair keys case-insensitively against tagged prop ids", async () => {
    vi.stubGlobal("webflow", {
      getCurrentComponent: vi.fn().mockResolvedValue(null),
      exitComponent: vi.fn().mockResolvedValue(undefined),
    });
    const setProps = vi.fn().mockResolvedValue([]);
    const parentInstance = {
      searchProps: vi.fn().mockResolvedValue([
        {
          propId: "CTA-LINK",
          valueType: "link",
          hasOverride: false,
          value: { sourceType: "static", value: null },
          resolvedValue: null,
          defaultValue: null,
          display: { label: "Link", group: null },
        },
      ]),
      setProps,
      getComponent: vi.fn().mockResolvedValue({ id: "card-primary" }),
    } as unknown as ComponentElement;

    const n = await seedNestedPublishPlaceholdersOnPlacedInstance(
      parentInstance,
      [linkMeta],
      new Set(["CTA-LINK"]),
      new Set(["nested-link|cta-link"])
    );
    expect(n).toBe(1);
    expect(setProps).toHaveBeenCalledWith([{ propId: "CTA-LINK", value: linkPlaceholder }]);
    vi.unstubAllGlobals();
  });
});

describe("seedHiddenListPublishPlaceholders", () => {
  it("sets placeholders only for tagged exposed props that are empty", async () => {
    const setProps = vi.fn().mockResolvedValue([]);
    const instance = {
      searchProps: vi.fn().mockResolvedValue([
        {
          propId: "cta-link",
          valueType: "link",
          hasOverride: false,
          value: { sourceType: "static", value: null },
          resolvedValue: null,
          defaultValue: null,
          display: { label: "Link", group: null },
        },
      ]),
      setProps,
    } as unknown as ComponentElement;

    const n = await seedHiddenListPublishPlaceholders(instance, [linkMeta], new Set(["cta-link"]));
    expect(n).toBe(1);
    expect(setProps).toHaveBeenCalledWith([{ propId: "cta-link", value: linkPlaceholder }]);
  });

  it("skips props that already have a value", async () => {
    const setProps = vi.fn();
    const instance = {
      searchProps: vi.fn().mockResolvedValue([
        {
          propId: "cta-link",
          valueType: "link",
          hasOverride: true,
          value: { sourceType: "static", value: "https://x.test" },
          resolvedValue: "https://x.test",
          defaultValue: null,
          display: { label: "Link", group: null },
        },
      ]),
      setProps,
    } as unknown as ComponentElement;

    const n = await seedHiddenListPublishPlaceholders(instance, [linkMeta], new Set(["cta-link"]));
    expect(n).toBe(0);
    expect(setProps).not.toHaveBeenCalled();
  });

  it("matches exposed + tagged prop ids case-insensitively", async () => {
    const setProps = vi.fn().mockResolvedValue([]);
    const instance = {
      searchProps: vi.fn().mockResolvedValue([
        {
          propId: "CTA-LINK",
          valueType: "link",
          hasOverride: false,
          value: { sourceType: "static", value: null },
          resolvedValue: null,
          defaultValue: null,
          display: { label: "Link", group: null },
        },
      ]),
      setProps,
    } as unknown as ComponentElement;

    const n = await seedHiddenListPublishPlaceholders(instance, [linkMeta], new Set(["cta-link"]));
    expect(n).toBe(1);
    expect(setProps).toHaveBeenCalledWith([{ propId: "CTA-LINK", value: linkPlaceholder }]);
  });
});
