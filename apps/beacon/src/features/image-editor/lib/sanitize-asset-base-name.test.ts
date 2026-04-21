import { describe, expect, it } from "vitest";

import { assetBaseNameFromFileName, sanitizeAssetBaseName } from "./sanitize-asset-base-name";

describe("sanitizeAssetBaseName", () => {
  it("replaces illegal path characters with dash", () => {
    expect(sanitizeAssetBaseName("foo/bar:name")).toBe("foo-bar-name");
  });

  it("strips common image extensions case-insensitively", () => {
    expect(sanitizeAssetBaseName("  Hero.JPEG  ")).toBe("Hero");
    expect(sanitizeAssetBaseName("shot.webp")).toBe("shot");
  });

  it("uses edited when result would be empty", () => {
    expect(sanitizeAssetBaseName("   ")).toBe("edited");
  });

  it("truncates to 100 chars", () => {
    const long = "a".repeat(120);
    expect(sanitizeAssetBaseName(long).length).toBe(100);
  });
});

describe("assetBaseNameFromFileName", () => {
  it("uses stem then sanitizes", () => {
    expect(assetBaseNameFromFileName("My Photo (1).png")).toBe("My Photo (1)");
  });
});
