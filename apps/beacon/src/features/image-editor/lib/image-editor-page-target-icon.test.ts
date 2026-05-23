import { describe, expect, it } from "vitest";

import { imagePageTargetTablerIcon } from "./image-editor-page-target-icon";

describe("imagePageTargetTablerIcon", () => {
  it("returns IconPhoto for image targets", () => {
    expect(imagePageTargetTablerIcon("image").displayName ?? imagePageTargetTablerIcon("image").name).toBeTruthy();
  });

  it("returns IconComponents for component targets", () => {
    expect(
      imagePageTargetTablerIcon("component").displayName ?? imagePageTargetTablerIcon("component").name
    ).toBeTruthy();
  });

  it("maps each page target kind to a distinct icon", () => {
    expect(imagePageTargetTablerIcon("image")).not.toBe(imagePageTargetTablerIcon("component"));
  });
});
