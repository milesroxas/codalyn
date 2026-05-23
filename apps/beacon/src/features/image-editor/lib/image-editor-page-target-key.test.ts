import { describe, expect, it } from "vitest";

import { pageTargetStableKey } from "./image-editor-page-target-key";
import type { ImagePageTarget } from "./scan-image-targets-on-page";

describe("pageTargetStableKey", () => {
  it("returns a stable key for the same element identity", () => {
    const element = { id: { element: "img_1" } } as ImageElement;
    const a: ImagePageTarget = { id: "hint", kind: "image", element, label: "Hero" };
    const b: ImagePageTarget = { id: "list", kind: "image", element, label: "Hero" };
    expect(pageTargetStableKey(a)).toBe(pageTargetStableKey(b));
  });

  it("includes component image prop id in the key", () => {
    const element = { id: { element: "inst_1" } } as ComponentElement;
    expect(
      pageTargetStableKey({
        id: "comp",
        kind: "component",
        element,
        label: "Card",
        imagePropId: "prop_a",
      })
    ).toBe("component:inst_1:prop_a");
  });
});
