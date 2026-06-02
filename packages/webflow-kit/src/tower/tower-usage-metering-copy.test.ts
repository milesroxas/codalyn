import { describe, expect, it } from "vitest";
import {
  TOWER_AVIF_LIMIT_FALLBACK_TITLE,
  towerUsageLimitDialogUsageLine,
  towerUsageMeterLabel,
  towerUsageMeterTooltip,
  towerUsageMeterTooltipContent,
} from "./tower-usage-metering-copy.js";
import { towerUsageProductFeatureLabel } from "./tower-usage-product-feature.js";

describe("image meter copy", () => {
  it("labels the image meter as optimization credits", () => {
    expect(towerUsageMeterLabel("image")).toBe("Image optimization credits");
    expect(towerUsageMeterLabel("webflowProxy")).toBe("Designer API requests");
    expect(towerUsageMeterLabel("cmsWrite")).toBe("Layout saves");
  });

  it("describes image usage as credits in the limit dialog line", () => {
    expect(towerUsageLimitDialogUsageLine(8, 25, "image")).toBe("8 / 25 image optimization credits used this month.");
  });

  it("frames the AVIF fallback as exhausted credits", () => {
    expect(TOWER_AVIF_LIMIT_FALLBACK_TITLE).toBe("Image optimization credits used up");
  });
});

describe("towerUsageMeterTooltipContent", () => {
  it("returns structured sections for each meter kind", () => {
    const content = towerUsageMeterTooltipContent("webflowProxy");

    expect(content.title).toBe("Shared Webflow request limit");
    expect(content.summary).toContain("Beacon uses this limit whenever it updates your Webflow site");
    expect(content.sectionHeading).toBe("Actions that use this limit");
    expect(content.actionGroups.length).toBeGreaterThan(0);
    expect(content.actionGroups[0]).toEqual({
      product: "cmsSlots",
      details: [
        "Setting up or syncing the page script",
        "Creating a slot target",
        "Connecting a slot to a CMS field",
        "Opening or saving a Composer layout on a collection template",
      ],
    });
    expect(content.footnoteHeading).toBe("Separate limits");
    expect(content.footnote).toContain("image optimization credits");
  });

  it("groups repeated products into one badge section", () => {
    const content = towerUsageMeterTooltipContent("image");

    expect(content.title).toBe("Image optimization credit limit");
    expect(content.sectionHeading).toBe("Actions that use this limit");
    expect(content.footnoteHeading).toBe("Separate limits");
    expect(content.actionGroups).toEqual([
      {
        product: "imageUpload",
        details: [
          "Optimizing an AVIF image export through Tower",
          "Previewing optimized size estimates while adjusting crop, size, or quality",
        ],
      },
    ]);
  });

  it("returns structured sections for layout saves", () => {
    const content = towerUsageMeterTooltipContent("cmsWrite");

    expect(content.title).toBe("Layout save limit");
    expect(content.summary).toContain("Beacon uses this limit when CMS Slots saves a block-based layout");
    expect(content.sectionHeading).toBe("Actions that use this limit");
    expect(content.footnoteHeading).toBe("Separate limits");
    expect(content.actionGroups).toEqual([
      {
        product: "cmsSlots",
        details: ["Saving a block-based layout composition in Composer"],
      },
    ]);
  });

  it("splits webflow proxy actions by product", () => {
    const content = towerUsageMeterTooltipContent("webflowProxy");

    expect(content.actionGroups).toEqual([
      {
        product: "cmsSlots",
        details: [
          "Setting up or syncing the page script",
          "Creating a slot target",
          "Connecting a slot to a CMS field",
          "Opening or saving a Composer layout on a collection template",
        ],
      },
      {
        product: "imageUpload",
        details: ["Publishing an image to a CMS collection field"],
      },
    ]);
  });
});

describe("towerUsageMeterTooltip", () => {
  it("derives the legacy string from grouped content", () => {
    const content = towerUsageMeterTooltipContent("cmsWrite");
    const legacy = towerUsageMeterTooltip("cmsWrite");

    expect(legacy).toContain(content.summary);
    expect(legacy).toContain(content.sectionHeading);
    const firstGroup = content.actionGroups[0];
    if (!firstGroup) {
      throw new Error("expected cmsWrite tooltip action group");
    }
    expect(legacy).toContain(towerUsageProductFeatureLabel(firstGroup.product));
    expect(legacy).toContain(`  • ${firstGroup.details[0]}`);
    expect(legacy).toContain(content.footnote);
  });
});
