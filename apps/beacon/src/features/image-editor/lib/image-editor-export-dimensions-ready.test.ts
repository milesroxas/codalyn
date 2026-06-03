import type { ResolverOutput } from "@codalyn/webflow-kit";
import { describe, expect, it } from "vitest";
import {
  resolveEffectiveExportConstraints,
  resolveExportDimensionsReady,
  resolveManualSessionExportDimensionsReady,
} from "./image-editor-export-dimensions-ready";

describe("resolveManualSessionExportDimensionsReady", () => {
  it("requires both dimensions in custom mode", () => {
    expect(
      resolveManualSessionExportDimensionsReady({
        cropFrameMode: "custom",
        widthStr: "1200",
        heightStr: "",
        aspectPreset: "free",
      })
    ).toBe(false);
    expect(
      resolveManualSessionExportDimensionsReady({
        cropFrameMode: "custom",
        widthStr: "1200",
        heightStr: "800",
        aspectPreset: "free",
      })
    ).toBe(true);
  });

  it("requires aspect and max width in aspect mode", () => {
    expect(
      resolveManualSessionExportDimensionsReady({
        cropFrameMode: "aspect",
        widthStr: "",
        heightStr: "",
        aspectPreset: "unset",
      })
    ).toBe(false);
    expect(
      resolveManualSessionExportDimensionsReady({
        cropFrameMode: "aspect",
        widthStr: "1200",
        heightStr: "",
        aspectPreset: "16-9",
      })
    ).toBe(true);
  });
});

describe("resolveEffectiveExportConstraints", () => {
  const constraints = {
    width: 1200,
    height: 800,
    exportFormat: "webp" as const,
    maxFileSizeBytes: 90_000,
    quality: 0.75,
  };

  const siteDefaultReadout: ResolverOutput = {
    constraints,
    source: "site-default",
    presetId: "preset-site",
    blockers: [],
  };

  it("uses resolver readout when picker selection is manual", () => {
    expect(
      resolveEffectiveExportConstraints({
        uploadPresetManualOverride: false,
        selectedPresetConstraints: null,
        resolvedReadout: siteDefaultReadout,
      })
    ).toEqual(constraints);
  });

  it("returns null when manual override is active", () => {
    expect(
      resolveEffectiveExportConstraints({
        uploadPresetManualOverride: true,
        selectedPresetConstraints: null,
        resolvedReadout: siteDefaultReadout,
      })
    ).toBeNull();
  });

  it("prefers picker constraints over readout when both are present", () => {
    const pickerConstraints = { ...constraints, width: 900, height: 600 };
    expect(
      resolveEffectiveExportConstraints({
        uploadPresetManualOverride: false,
        selectedPresetConstraints: pickerConstraints,
        resolvedReadout: siteDefaultReadout,
      })
    ).toEqual(pickerConstraints);
  });
});

describe("resolveExportDimensionsReady", () => {
  const constraints = {
    width: 1200,
    height: 800,
    exportFormat: "webp" as const,
    maxFileSizeBytes: 90_000,
    quality: 0.75,
  };

  it("is ready when tagged dimensions are active", () => {
    expect(
      resolveExportDimensionsReady({
        effectiveTaggedDimensionsActive: true,
        effectiveExportConstraints: null,
        cropFrameMode: "aspect",
        widthStr: "",
        heightStr: "",
        aspectPreset: "unset",
      })
    ).toBe(true);
  });

  it("falls through to manual rules when effective constraints are missing", () => {
    expect(
      resolveExportDimensionsReady({
        effectiveTaggedDimensionsActive: false,
        effectiveExportConstraints: null,
        cropFrameMode: "aspect",
        widthStr: "1200",
        heightStr: "",
        aspectPreset: "1",
      })
    ).toBe(true);
  });

  it("is ready when effective constraints include site default sizing", () => {
    expect(
      resolveExportDimensionsReady({
        effectiveTaggedDimensionsActive: false,
        effectiveExportConstraints: constraints,
        cropFrameMode: "aspect",
        widthStr: "",
        heightStr: "",
        aspectPreset: "unset",
      })
    ).toBe(true);
  });
});
