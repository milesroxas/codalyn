import { describe, expect, it } from "vitest";
import { towerUsageMeterTooltip, towerUsageMeterTooltipContent } from "./tower-usage-metering-copy.js";

describe("towerUsageMeterTooltipContent", () => {
  it("returns structured sections for each meter kind", () => {
    const content = towerUsageMeterTooltipContent("webflowProxy");

    expect(content.summary).toContain("Webflow Data API request");
    expect(content.sectionHeading).toBe("Counts when you:");
    expect(content.actions.length).toBeGreaterThan(0);
    expect(content.actions[0]).toEqual({
      feature: "CMS Slots",
      detail: "install or sync the page script",
    });
    expect(content.footnote).toContain("AVIF exports");
  });

  it("splits feature and detail on the em dash separator", () => {
    const content = towerUsageMeterTooltipContent("image");

    expect(content.actions).toEqual([
      { feature: "Image Upload", detail: "export an image as AVIF" },
      { feature: "Image Upload", detail: "AVIF size estimates while adjusting crop, size, or quality" },
    ]);
  });
});

describe("towerUsageMeterTooltip", () => {
  it("derives the legacy string from structured content", () => {
    const content = towerUsageMeterTooltipContent("cmsWrite");
    const legacy = towerUsageMeterTooltip("cmsWrite");

    expect(legacy).toContain(content.summary);
    expect(legacy).toContain(content.sectionHeading);
    expect(legacy).toContain(`• ${content.actions[0]?.feature} — ${content.actions[0]?.detail}`);
    expect(legacy).toContain(content.footnote);
  });
});
