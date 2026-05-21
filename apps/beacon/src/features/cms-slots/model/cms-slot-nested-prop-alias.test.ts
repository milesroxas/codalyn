import { describe, expect, it } from "vitest";
import {
  collectNestedPublishSeedPairsFromBinding,
  mapNestedPropsToExposedIds,
  nestedPublishSeedPairKey,
} from "@/features/cms-slots/model/cms-slot-nested-prop-alias";

describe("mapNestedPropsToExposedIds", () => {
  const exposed = new Set(["parent-title", "parent-img"]);

  it("maps nested prop ids wired to exposed parent props", () => {
    const alias = mapNestedPropsToExposedIds(
      [
        { propId: "card-title", value: { sourceType: "prop", propId: "parent-title" } },
        { propId: "card-img", value: { sourceType: "prop", propId: "parent-img" } },
      ],
      exposed
    );
    expect(alias.get("card-title")).toBe("parent-title");
    expect(alias.get("card-img")).toBe("parent-img");
  });

  it("ignores nested props not wired to an exposed parent prop", () => {
    const alias = mapNestedPropsToExposedIds(
      [{ propId: "card-body", value: { sourceType: "prop", propId: "parent-internal" } }],
      exposed
    );
    expect(alias.size).toBe(0);
  });

  it("resolves transitive wiring through an upstream alias map", () => {
    const cardAlias = mapNestedPropsToExposedIds(
      [{ propId: "card-title", value: { sourceType: "prop", propId: "parent-title" } }],
      exposed
    );
    const buttonAlias = mapNestedPropsToExposedIds(
      [{ propId: "btn-label", value: { sourceType: "prop", propId: "card-title" } }],
      exposed,
      cardAlias
    );
    expect(buttonAlias.get("btn-label")).toBe("parent-title");
  });
});

describe("collectNestedPublishSeedPairsFromBinding", () => {
  it("records nested prop ids tagged below the root component", () => {
    expect(collectNestedPublishSeedPairsFromBinding("card-link", "cta-link", 1)).toEqual({
      nestedPropId: "card-link",
      canonicalPropId: "cta-link",
    });
  });

  it("ignores root-level bindings and same-id bindings", () => {
    expect(collectNestedPublishSeedPairsFromBinding("cta-link", "cta-link", 1)).toBeNull();
    expect(collectNestedPublishSeedPairsFromBinding("card-link", "cta-link", 0)).toBeNull();
  });

  it("builds stable pair keys", () => {
    expect(nestedPublishSeedPairKey({ nestedPropId: "Card-Link", canonicalPropId: "CTA-LINK" })).toBe(
      "card-link|cta-link"
    );
  });
});
