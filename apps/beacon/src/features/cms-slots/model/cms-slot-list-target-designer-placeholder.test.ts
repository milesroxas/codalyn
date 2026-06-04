import { describe, expect, it } from "vitest";
import {
  CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_INLINE_KEYS,
  cmsSlotListTargetDesignerPlaceholderInlineStyle,
  cmsSlotListTargetDesignerPlaceholderRuntimeRemovalSource,
} from "@/features/cms-slots/model/cms-slot-list-target-designer-placeholder";

describe("cms-slot-list-target-designer-placeholder", () => {
  it("serializes inline placeholder styles that hide CMS JSON text and fill the parent", () => {
    const style = cmsSlotListTargetDesignerPlaceholderInlineStyle();
    expect(style).toContain("color:transparent");
    expect(style).toContain("font-size:0");
    expect(style).toContain("display:block");
    expect(style).toContain("width:100%");
    expect(style).toContain("height:100%");
    expect(style).toContain("min-height:max(3rem, 100%)");
    expect(style).toContain("align-self:stretch");
  });

  it("embeds runtime removal for every inline key", () => {
    const snippet = cmsSlotListTargetDesignerPlaceholderRuntimeRemovalSource();
    for (const key of CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_INLINE_KEYS) {
      expect(snippet).toContain(JSON.stringify(key));
    }
    expect(snippet).toContain("removeProperty");
  });
});
