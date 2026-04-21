import { describe, expect, it } from "vitest";

import { fileStemWithoutExtension } from "./file-name";

describe("fileStemWithoutExtension", () => {
  it("returns full string when there is no dot", () => {
    expect(fileStemWithoutExtension("photo")).toBe("photo");
  });

  it("strips last extension", () => {
    expect(fileStemWithoutExtension("photo.final.png")).toBe("photo.final");
  });

  it("for leading-dot names, empty stem falls back to full filename", () => {
    expect(fileStemWithoutExtension(".hidden")).toBe(".hidden");
  });
});
