import { describe, expect, it } from "vitest";
import { parseCmsLayoutLoadRequest, parseCmsLayoutSaveRequest, webflowCmsItemUrl } from "./beacon-cms-layout";

const COLLECTION_ID = "65f1c2d3e4a5b6c7d8e9f0a1";
const ITEM_ID = "65f1c2d3e4a5b6c7d8e9f0a2";

describe("cms-layout request parsers — id shape guard", () => {
  it("accepts canonical 24-hex Webflow ids (either casing, surrounding whitespace trimmed)", () => {
    expect(parseCmsLayoutLoadRequest({ collectionId: COLLECTION_ID, itemId: ITEM_ID })).toEqual({
      collectionId: COLLECTION_ID,
      itemId: ITEM_ID,
    });
    expect(parseCmsLayoutLoadRequest({ collectionId: ` ${COLLECTION_ID.toUpperCase()} `, itemId: ITEM_ID })).toEqual({
      collectionId: COLLECTION_ID.toUpperCase(),
      itemId: ITEM_ID,
    });
  });

  it("rejects path-like and otherwise malformed ids", () => {
    for (const bad of ["../sites/x", "col_1", "", "65f1c2d3e4a5b6c7d8e9f0a", `${COLLECTION_ID}/items`, 123, null]) {
      expect(parseCmsLayoutLoadRequest({ collectionId: bad, itemId: ITEM_ID })).toBeNull();
      expect(parseCmsLayoutLoadRequest({ collectionId: COLLECTION_ID, itemId: bad })).toBeNull();
    }
  });

  it("applies the same guard to save requests", () => {
    const composition = { v: 1 as const, blocks: [] };
    expect(parseCmsLayoutSaveRequest({ collectionId: COLLECTION_ID, itemId: ITEM_ID, composition })).toEqual({
      collectionId: COLLECTION_ID,
      itemId: ITEM_ID,
      composition,
    });
    expect(parseCmsLayoutSaveRequest({ collectionId: "../sites/x", itemId: ITEM_ID, composition })).toBeNull();
  });

  it("builds the item URL only from validated ids", () => {
    expect(webflowCmsItemUrl(COLLECTION_ID, ITEM_ID).toString()).toBe(
      `https://api.webflow.com/v2/collections/${COLLECTION_ID}/items/${ITEM_ID}`
    );
  });
});
