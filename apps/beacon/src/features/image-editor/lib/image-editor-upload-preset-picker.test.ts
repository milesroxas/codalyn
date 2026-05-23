import {
  type BeaconAppSettings,
  getDefaultBeaconAppSettings,
  type ResolvedUploadTarget,
  type ResolverOutput,
  serializePresetTargetKey,
} from "@codalyn/webflow-kit";
import { describe, expect, it } from "vitest";
import {
  buildUploadPresetPickerOptions,
  getDefaultUploadPresetOptionId,
  isManualUploadPresetOptionId,
} from "./image-editor-upload-preset-picker";

function makeSettings(patch: Partial<BeaconAppSettings>): BeaconAppSettings {
  return { ...getDefaultBeaconAppSettings(), ...patch };
}

function makeBareTarget(tagged: { width: number; height: number } | null): ResolvedUploadTarget {
  return {
    kind: "bare-image",
    siteId: "site-1",
    pageId: "page-1",
    elementId: "img-1",
    tagged,
  };
}

function makeReadout(overrides: Partial<ResolverOutput>): ResolverOutput {
  return {
    constraints: {
      width: 1200,
      height: 800,
      exportFormat: "webp",
      maxFileSizeBytes: 120_000,
      quality: 0.75,
    },
    source: "instance",
    presetId: "preset-instance",
    blockers: [],
    ...overrides,
  };
}

describe("buildUploadPresetPickerOptions", () => {
  it("returns manual-only option when team presets are not allowed", () => {
    const options = buildUploadPresetPickerOptions({
      enabled: true,
      settings: getDefaultBeaconAppSettings(),
      target: makeBareTarget(null),
      readout: makeReadout({ source: "manual", constraints: null, presetId: null }),
      allowTeamPresets: false,
    });
    expect(options).toHaveLength(1);
    expect(isManualUploadPresetOptionId(options[0]?.id ?? "")).toBe(true);
  });

  it("builds bare-image instance, element, and site-default options for valid target keys", () => {
    const instanceKey = serializePresetTargetKey({
      kind: "bare-image-instance",
      siteId: "site-1",
      pageId: "page-1",
      elementId: "img-1",
    });
    const elementKey = serializePresetTargetKey({
      kind: "bare-image-element",
      siteId: "site-1",
    });
    const settings = makeSettings({
      imagePresetStorage: {
        siteDefault: {
          id: "preset-site",
          name: "Site",
          width: 1600,
          height: 900,
          exportFormat: "webp",
          maxFileSizeBytes: 140_000,
          targetKey: { kind: "site-default", siteId: "site-1" },
        },
        byTargetKey: {
          [instanceKey]: {
            id: "preset-instance",
            name: "Instance",
            width: 1200,
            height: 800,
            exportFormat: "avif",
            maxFileSizeBytes: 90_000,
            targetKey: { kind: "bare-image-instance", siteId: "site-1", pageId: "page-1", elementId: "img-1" },
          },
          [elementKey]: {
            id: "preset-element",
            name: "Element",
            width: 1000,
            height: 700,
            exportFormat: "webp",
            maxFileSizeBytes: 80_000,
            targetKey: { kind: "bare-image-element", siteId: "site-1" },
          },
        },
      },
    });
    const options = buildUploadPresetPickerOptions({
      enabled: true,
      settings,
      target: makeBareTarget(null),
      readout: makeReadout({ source: "instance" }),
      allowTeamPresets: true,
    });
    expect(options.map((option) => option.scope)).toEqual(["active", "instance", "element", "site-default", "manual"]);
  });

  it("keeps tagged dimensions precedence while taking format and max-file-size from selected preset row", () => {
    const instanceKey = serializePresetTargetKey({
      kind: "bare-image-instance",
      siteId: "site-1",
      pageId: "page-1",
      elementId: "img-1",
    });
    const settings = makeSettings({
      imagePresetStorage: {
        siteDefault: null,
        byTargetKey: {
          [instanceKey]: {
            id: "preset-instance",
            name: "Instance",
            width: 900,
            height: 600,
            exportFormat: "avif",
            maxFileSizeBytes: 88_000,
            targetKey: { kind: "bare-image-instance", siteId: "site-1", pageId: "page-1", elementId: "img-1" },
          },
        },
      },
    });
    const options = buildUploadPresetPickerOptions({
      enabled: true,
      settings,
      target: makeBareTarget({ width: 1200, height: 800 }),
      readout: makeReadout({ source: "tagged" }),
      allowTeamPresets: true,
    });
    const instanceOption = options.find((option) => option.scope === "instance");
    expect(instanceOption?.constraints).toEqual({
      width: 1200,
      height: 800,
      exportFormat: "avif",
      maxFileSizeBytes: 88_000,
      quality: settings.defaultExportQuality,
    });
  });

  it("returns manual-only option for cms-ambiguous target", () => {
    const options = buildUploadPresetPickerOptions({
      enabled: true,
      settings: getDefaultBeaconAppSettings(),
      target: { kind: "cms-ambiguous", siteId: "site-1" },
      readout: makeReadout({ source: "manual", constraints: null, presetId: null }),
      allowTeamPresets: true,
    });
    expect(options).toHaveLength(1);
    expect(options[0]?.scope).toBe("manual");
  });
});

describe("getDefaultUploadPresetOptionId", () => {
  it("uses manual id for manual resolver output", () => {
    const id = getDefaultUploadPresetOptionId(makeReadout({ source: "manual", constraints: null, presetId: null }));
    expect(isManualUploadPresetOptionId(id)).toBe(true);
  });

  it("uses resolved id for non-manual resolver output", () => {
    const id = getDefaultUploadPresetOptionId(makeReadout({ source: "site-default" }));
    expect(isManualUploadPresetOptionId(id)).toBe(false);
  });
});
