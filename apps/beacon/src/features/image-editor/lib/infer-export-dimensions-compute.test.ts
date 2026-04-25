import { describe, expect, it } from "vitest";

import { computeExportDimensionsFromAspectChain, resolveAspect } from "./infer-export-dimensions-compute";

const RATIO_16_9 = 16 / 9;

describe("resolveAspect", () => {
  it("prefers image-style aspect over parents and asset", () => {
    const r = resolveAspect(2, [{ aspect: 1, label: ".wrap" }], { w: 800, h: 600 });
    expect(r.aspect).toBe(2);
    expect(r.aspectSource).toBe("image-style");
  });

  it("falls through to the first parent with an aspect", () => {
    const r = resolveAspect(
      undefined,
      [
        { aspect: undefined, label: ".outer" },
        { aspect: 1, label: ".card_image" },
      ],
      { w: 1024, h: 768 }
    );
    expect(r.aspect).toBe(1);
    expect(r.aspectSource).toBe("parent-style");
    expect(r.aspectSourceLabel).toBe(".card_image");
  });

  it("falls back to the asset ratio when no style-authored aspect is found", () => {
    const r = resolveAspect(undefined, [{ aspect: undefined }], { w: 1200, h: 800 });
    expect(r.aspect).toBeCloseTo(1.5);
    expect(r.aspectSource).toBe("asset");
  });

  it("returns 16:9 as the default when nothing else is available", () => {
    const r = resolveAspect(undefined, [], {});
    expect(r.aspect).toBeCloseTo(RATIO_16_9);
    expect(r.aspectSource).toBe("default");
  });

  it("ignores non-positive or non-finite aspect values", () => {
    const r = resolveAspect(Number.NaN, [{ aspect: 0 }, { aspect: -1 }], { w: 800, h: 800 });
    expect(r.aspect).toBe(1);
    expect(r.aspectSource).toBe("asset");
  });
});

describe("computeExportDimensionsFromAspectChain", () => {
  it("uses the asset long edge when asset dimensions are known", () => {
    const r = computeExportDimensionsFromAspectChain(1, [], { w: 2000, h: 1000 });
    expect(r.inferenceSource).toBe("aspect-chain");
    expect(r.longEdge).toBe(2000);
    expect(r.longEdgeSource).toBe("asset");
    expect(r.width).toBe(2000);
    expect(r.height).toBe(2000);
    expect(r.aspectSource).toBe("image-style");
  });

  it("uses a portrait layout when aspect < 1", () => {
    const r = computeExportDimensionsFromAspectChain(0.5, [], { w: 1200, h: 1600 });
    expect(r.inferenceSource).toBe("aspect-chain");
    expect(r.longEdge).toBe(1600);
    expect(r.width).toBe(800);
    expect(r.height).toBe(1600);
  });

  it("clamps output to the max export edge", () => {
    const r = computeExportDimensionsFromAspectChain(1, [], { w: 5000, h: 5000 });
    expect(r.inferenceSource).toBe("aspect-chain");
    expect(Math.max(r.width, r.height)).toBeLessThanOrEqual(2560);
    expect(r.width).toBe(r.height);
  });

  it("uses the 1920 default long edge when no asset dimensions are known", () => {
    const r = computeExportDimensionsFromAspectChain(RATIO_16_9, [], {});
    expect(r.inferenceSource).toBe("aspect-chain");
    expect(r.longEdge).toBe(1920);
    expect(r.longEdgeSource).toBe("default");
    expect(r.width).toBe(1920);
    expect(r.height).toBe(1080);
  });

  it("falls back to the asset ratio when no style aspect exists", () => {
    const r = computeExportDimensionsFromAspectChain(undefined, [], { w: 400, h: 200 });
    expect(r.inferenceSource).toBe("aspect-chain");
    expect(r.aspectSource).toBe("asset");
    expect(r.aspect).toBeCloseTo(2);
    expect(r.width).toBe(400);
    expect(r.height).toBe(200);
  });

  it("falls back to 16:9 default when nothing is available", () => {
    const r = computeExportDimensionsFromAspectChain(undefined, [], {});
    expect(r.inferenceSource).toBe("aspect-chain");
    expect(r.aspectSource).toBe("default");
    expect(r.width).toBe(1920);
    expect(r.height).toBe(1080);
  });

  it("labels the parent source in the note when parent style wins", () => {
    const r = computeExportDimensionsFromAspectChain(undefined, [{ aspect: 1, label: ".card_image" }], {
      w: 1024,
      h: 1024,
    });
    expect(r.inferenceSource).toBe("aspect-chain");
    expect(r.aspectSource).toBe("parent-style");
    expect(r.note).toContain(".card_image");
    expect(r.note).toContain("long edge from file");
  });
});
