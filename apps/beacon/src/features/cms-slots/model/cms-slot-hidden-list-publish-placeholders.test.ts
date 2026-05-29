import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  CMS_SLOT_PUBLISH_PLACEHOLDER_URL,
  isHiddenListInstancePropEmpty,
  isSearchInstancePropEmpty,
  publishPlaceholderForExposedProp,
  publishPlaceholderForValueType,
  resolveSeedPlaceholderValue,
  seedConditionalControllerPlaceholders,
} from "@/features/cms-slots/model/cms-slot-hidden-list-publish-placeholders";

const linkMeta: ComposableInstancePropMeta = { propId: "cta-link", label: "Link", valueType: "link" };
const linkPlaceholder = { mode: "url", to: CMS_SLOT_PUBLISH_PLACEHOLDER_URL } as const;

function stubWebflowForPageScope(): void {
  vi.stubGlobal("webflow", {
    getCurrentComponent: vi.fn().mockResolvedValue(null),
    exitComponent: vi.fn().mockResolvedValue(undefined),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it("uses a truthy boolean for visibility toggles", () => {
    expect(publishPlaceholderForValueType("boolean")).toBe(true);
    expect(publishPlaceholderForValueType("visibility")).toBe(true);
  });

  it("does not use a URL string for imageAsset setProps", () => {
    expect(publishPlaceholderForValueType("imageAsset")).toBe("\u00a0");
    expect(resolveSeedPlaceholderValue("imageAsset", "asset-123")).toBe("asset-123");
    expect(resolveSeedPlaceholderValue("imageAsset", null)).toBeNull();
  });
});

describe("seedConditionalControllerPlaceholders", () => {
  it("seeds a truthy placeholder on empty controller props", async () => {
    stubWebflowForPageScope();
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

    const n = await seedConditionalControllerPlaceholders(instance, new Set(["cta-link"]));
    expect(n).toBe(1);
    expect(setProps).toHaveBeenCalledWith([{ propId: "cta-link", value: linkPlaceholder }]);
  });

  it("skips controller props that already have a value", async () => {
    stubWebflowForPageScope();
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

    const n = await seedConditionalControllerPlaceholders(instance, new Set(["cta-link"]));
    expect(n).toBe(0);
    expect(setProps).not.toHaveBeenCalled();
  });

  it("matches controller ids case-insensitively and skips ids absent from the instance", async () => {
    stubWebflowForPageScope();
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

    const n = await seedConditionalControllerPlaceholders(instance, new Set(["cta-link", "not-a-prop"]));
    expect(n).toBe(1);
    expect(setProps).toHaveBeenCalledWith([{ propId: "CTA-LINK", value: linkPlaceholder }]);
  });
});
