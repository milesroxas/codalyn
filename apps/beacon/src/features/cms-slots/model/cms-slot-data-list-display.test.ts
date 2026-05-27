import { describe, expect, it } from "vitest";
import { displayLabelForCmsSlotList, displayLabelForDataList } from "./cms-slot-data-list-display";

describe("displayLabelForDataList", () => {
  it("strips the beacon- prefix", () => {
    expect(displayLabelForDataList("beacon-hero-cta")).toBe("hero-cta");
  });
});

describe("displayLabelForCmsSlotList", () => {
  it("prefers persisted display name over slug label", () => {
    expect(
      displayLabelForCmsSlotList({
        dataList: "beacon-hero-cta",
        displayName: "Hero CTA",
      })
    ).toBe("Hero CTA");
  });

  it("falls back to slug label when display name is missing", () => {
    expect(
      displayLabelForCmsSlotList({
        dataList: "beacon-hero-cta",
        displayName: null,
      })
    ).toBe("hero-cta");
  });

  it("ignores empty persisted display names", () => {
    expect(
      displayLabelForCmsSlotList({
        dataList: "beacon-hero-cta",
        displayName: "   ",
      })
    ).toBe("hero-cta");
  });
});
