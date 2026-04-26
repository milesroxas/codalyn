import { describe, expect, it } from "vitest";
import { getBeaconPageInlineScriptSource } from "@/features/beacons/model/beacon-page-inline-script";

describe("getBeaconPageInlineScriptSource", () => {
  it("parses in JS", () => {
    const s = getBeaconPageInlineScriptSource();
    expect(() => {
      void new Function("document", "window", "addEventListener", s);
    }).not.toThrow();
  });
});
