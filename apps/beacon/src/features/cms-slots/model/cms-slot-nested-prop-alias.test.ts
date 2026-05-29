import { describe, expect, it } from "vitest";
import { mapNestedPropsToExposedIds } from "@/features/cms-slots/model/cms-slot-nested-prop-alias";

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
