import type { ResolverOutput } from "@codalyn/webflow-kit";
import { describe, expect, it } from "vitest";
import { resolveSessionResolvedConstraintsApplication } from "./image-editor-session-resolved-constraints";

function makeReadout(overrides: Partial<ResolverOutput>): ResolverOutput {
  return {
    constraints: {
      width: 1200,
      height: 800,
      exportFormat: "avif",
      maxFileSizeBytes: 88_000,
      quality: 0.75,
    },
    source: "instance",
    presetId: "preset-1",
    blockers: [],
    ...overrides,
  };
}

describe("resolveSessionResolvedConstraintsApplication", () => {
  it("does not apply when beaconPresetV2Apply is disabled", () => {
    const result = resolveSessionResolvedConstraintsApplication({
      enabled: false,
      imageSrc: "blob://img",
      readout: makeReadout({}),
    });
    expect(result.shouldApply).toBe(false);
  });

  it("applies non-manual resolver constraints to session fields", () => {
    const result = resolveSessionResolvedConstraintsApplication({
      enabled: true,
      imageSrc: "blob://img",
      readout: makeReadout({ source: "site-default" }),
    });
    expect(result.shouldApply).toBe(true);
    expect(result.constraints?.width).toBe(1200);
    expect(result.constraints?.height).toBe(800);
    expect(result.constraints?.exportFormat).toBe("avif");
    expect(result.constraints?.quality).toBe(0.75);
    expect(result.maxFileSizeBytes).toBe(88_000);
  });

  it("treats tagged width/height as active while preserving preset sub-resolution values", () => {
    const result = resolveSessionResolvedConstraintsApplication({
      enabled: true,
      imageSrc: "blob://img",
      readout: makeReadout({
        source: "tagged",
        constraints: {
          width: 1024,
          height: 512,
          exportFormat: "webp",
          maxFileSizeBytes: 66_000,
          quality: 0.82,
        },
      }),
    });
    expect(result.shouldApply).toBe(true);
    expect(result.taggedDimensionsActive).toBe(true);
    expect(result.constraints).toEqual({
      width: 1024,
      height: 512,
      exportFormat: "webp",
      maxFileSizeBytes: 66_000,
      quality: 0.82,
    });
    expect(result.maxFileSizeBytes).toBe(66_000);
  });

  it("keeps manual fallback and does not auto-apply", () => {
    const result = resolveSessionResolvedConstraintsApplication({
      enabled: true,
      imageSrc: "blob://img",
      readout: makeReadout({
        source: "manual",
        constraints: null,
        presetId: null,
      }),
    });
    expect(result.shouldApply).toBe(false);
    expect(result.constraints).toBeNull();
    expect(result.source).toBe("manual");
  });

  it("does not auto-apply when ambiguous-cms-binding blocker exists", () => {
    const result = resolveSessionResolvedConstraintsApplication({
      enabled: true,
      imageSrc: "blob://img",
      readout: makeReadout({
        source: "manual",
        constraints: null,
        blockers: ["ambiguous-cms-binding"],
        presetId: null,
      }),
    });
    expect(result.shouldApply).toBe(false);
    expect(result.source).toBe("manual");
  });
});
