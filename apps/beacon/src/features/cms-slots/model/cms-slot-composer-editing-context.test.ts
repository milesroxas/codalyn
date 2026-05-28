import { describe, expect, it } from "vitest";
import {
  extractCmsItemFieldData,
  parseCmsCollectionDisplayName,
  parseCmsItemEntryTitle,
} from "@/features/cms-slots/model/cms-slot-composer-editing-context";

describe("parseCmsCollectionDisplayName", () => {
  it("reads displayName from a canonical collection payload", () => {
    expect(parseCmsCollectionDisplayName({ displayName: "Blog posts" })).toBe("Blog posts");
  });

  it("returns null when displayName is missing or empty", () => {
    expect(parseCmsCollectionDisplayName({})).toBeNull();
    expect(parseCmsCollectionDisplayName({ displayName: "   " })).toBeNull();
    expect(parseCmsCollectionDisplayName(null)).toBeNull();
  });
});

describe("parseCmsItemEntryTitle", () => {
  it("reads name from canonical fieldData", () => {
    expect(
      parseCmsItemEntryTitle({
        fieldData: { name: "Launch post", slug: "launch-post" },
      })
    ).toBe("Launch post");
  });

  it("reads name from nested item.fieldData", () => {
    expect(
      parseCmsItemEntryTitle({
        item: { fieldData: { name: "Case study" } },
      })
    ).toBe("Case study");
  });

  it("normalizes wrapped name values", () => {
    expect(
      parseCmsItemEntryTitle({
        fieldData: { name: { value: "Wrapped title" } },
      })
    ).toBe("Wrapped title");
  });

  it("returns null when name is missing or malformed", () => {
    expect(parseCmsItemEntryTitle({ fieldData: { slug: "only-slug" } })).toBeNull();
    expect(parseCmsItemEntryTitle({ fieldData: { name: 42 } })).toBeNull();
    expect(parseCmsItemEntryTitle(null)).toBeNull();
  });
});

describe("extractCmsItemFieldData", () => {
  it("returns null when no fieldData is present", () => {
    expect(extractCmsItemFieldData({ id: "item_1" })).toBeNull();
  });
});
