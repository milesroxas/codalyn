import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeDisplayNameAttrValue } from "./cms-slot-data-list-display";
import { renameCmsSlotListOnPage } from "./rename-cms-slot-list-on-page";

describe("renameCmsSlotListOnPage", () => {
  const container = {
    id: { component: "c1", element: "e1" },
    setCustomAttribute: vi.fn(async () => {}),
  } as unknown as BlockElement;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects empty slug names before touching Webflow", async () => {
    const result = await renameCmsSlotListOnPage({
      container,
      fromDataList: "beacon-hero",
      nextDisplayName: "!!!",
      otherDataListsOnPage: new Set(),
    });
    expect(result).toEqual({ ok: false, reason: "Use a name with at least one letter or number." });
  });

  it("rejects duplicate data-list values on the page", async () => {
    const result = await renameCmsSlotListOnPage({
      container,
      fromDataList: "beacon-hero",
      nextDisplayName: "Footer CTA",
      otherDataListsOnPage: new Set(["beacon-footer-cta"]),
    });
    expect(result).toEqual({ ok: false, reason: "Another slot on this page already uses that name." });
  });

  it("returns ok without Designer calls when the slug is unchanged", async () => {
    const result = await renameCmsSlotListOnPage({
      container,
      fromDataList: "beacon-hero",
      nextDisplayName: "Hero",
      otherDataListsOnPage: new Set(),
    });
    expect(result).toEqual({ ok: true, dataList: "beacon-hero" });
    expect(container.setCustomAttribute).toHaveBeenCalledWith(
      "data-beacon-display-name",
      encodeDisplayNameAttrValue("Hero")
    );
  });
});
