import { describe, expect, it } from "vitest";

import { resolveDisplayedSurfaceTarget, targetFromSelectionHint } from "./image-editor-display-surface-target";
import type { ImagePageTarget, SelectedImageTargetHint } from "./scan-image-targets-on-page";

const imageTarget: ImagePageTarget = {
  id: "image-1",
  kind: "image",
  element: {} as ImageElement,
  label: "Hero",
};

const listTarget: ImagePageTarget = {
  id: "image-2",
  kind: "image",
  element: {} as ImageElement,
  label: "Card",
};

describe("targetFromSelectionHint", () => {
  it("returns a target for image and component hints", () => {
    const hint: SelectedImageTargetHint = { kind: "image", target: imageTarget };
    expect(targetFromSelectionHint(hint)).toBe(imageTarget);
  });

  it("returns null for none", () => {
    expect(targetFromSelectionHint({ kind: "none" })).toBeNull();
  });
});

describe("resolveDisplayedSurfaceTarget", () => {
  it("prefers live canvas selection over a committed list pick", () => {
    const hint: SelectedImageTargetHint = { kind: "image", target: imageTarget };
    expect(resolveDisplayedSurfaceTarget(hint, listTarget)).toBe(imageTarget);
  });

  it("falls back to committed target when canvas selection is empty", () => {
    expect(resolveDisplayedSurfaceTarget({ kind: "none" }, listTarget)).toBe(listTarget);
  });
});
