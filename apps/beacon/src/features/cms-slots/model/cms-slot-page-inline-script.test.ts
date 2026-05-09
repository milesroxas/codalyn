import { describe, expect, it } from "vitest";
import { getCmsSlotPageInlineScriptSource } from "@/features/cms-slots/model/cms-slot-page-inline-script";

describe("getCmsSlotPageInlineScriptSource", () => {
  it("parses in JS", () => {
    const s = getCmsSlotPageInlineScriptSource();
    expect(() => {
      void new Function("document", "window", "addEventListener", s);
    }).not.toThrow();
  });
});
