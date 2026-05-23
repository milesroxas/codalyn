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
  isUploadPresetExportFormatLocked,
  resolveAutoUploadPresetOptionId,
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

  it("lists resolved preset name, site default fallback, and manual override without scoped duplicates", () => {
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
      readout: makeReadout({ source: "instance", presetId: "preset-instance" }),
      allowTeamPresets: true,
    });
    expect(options.map((option) => option.label)).toEqual(["Instance", "Site", "Manual override"]);
    expect(options.map((option) => option.id)).toEqual([
      "preset:preset-instance",
      "preset:preset-site",
      "manual-override",
    ]);
  });

  it("omits site default when it is already the resolved preset", () => {
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
        byTargetKey: {},
      },
    });
    const options = buildUploadPresetPickerOptions({
      enabled: true,
      settings,
      target: makeBareTarget(null),
      readout: makeReadout({ source: "site-default", presetId: "preset-site" }),
      allowTeamPresets: true,
    });
    expect(options.map((option) => option.label)).toEqual(["Site", "Manual override"]);
  });

  it("keeps tagged dimensions on the resolved option while inheriting format and max-file-size from the preset row", () => {
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
      readout: makeReadout({
        source: "tagged",
        presetId: "preset-instance",
        constraints: {
          width: 1200,
          height: 800,
          exportFormat: "avif",
          maxFileSizeBytes: 88_000,
          quality: settings.defaultExportQuality,
        },
      }),
      allowTeamPresets: true,
    });
    const resolvedOption = options.find((option) => option.id === "preset:preset-instance");
    expect(resolvedOption?.label).toBe("Instance");
    expect(resolvedOption?.constraints).toEqual({
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

  it("marks resolved export format as configured when preset row sets format", () => {
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
            width: 1200,
            height: 800,
            exportFormat: "avif",
            maxFileSizeBytes: 90_000,
            targetKey: { kind: "bare-image-instance", siteId: "site-1", pageId: "page-1", elementId: "img-1" },
          },
        },
      },
    });
    const options = buildUploadPresetPickerOptions({
      enabled: true,
      settings,
      target: makeBareTarget(null),
      readout: makeReadout({ source: "instance", presetId: "preset-instance" }),
      allowTeamPresets: true,
    });
    const resolvedOption = options.find((option) => option.id === "preset:preset-instance");
    expect(resolvedOption?.exportFormatConfigured).toBe(true);
  });

  it("marks resolved export format as not configured when preset uses workspace default", () => {
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
            width: 1200,
            height: 800,
            maxFileSizeBytes: 90_000,
            targetKey: { kind: "bare-image-instance", siteId: "site-1", pageId: "page-1", elementId: "img-1" },
          },
        },
      },
    });
    const options = buildUploadPresetPickerOptions({
      enabled: true,
      settings,
      target: makeBareTarget(null),
      readout: makeReadout({ source: "instance", presetId: "preset-instance" }),
      allowTeamPresets: true,
    });
    const resolvedOption = options.find((option) => option.id === "preset:preset-instance");
    expect(resolvedOption?.exportFormatConfigured).toBe(false);
  });
});

describe("getDefaultUploadPresetOptionId", () => {
  it("uses manual id for manual resolver output", () => {
    const id = getDefaultUploadPresetOptionId(makeReadout({ source: "manual", constraints: null, presetId: null }));
    expect(isManualUploadPresetOptionId(id)).toBe(true);
  });

  it("uses resolved preset id for non-manual resolver output", () => {
    const id = getDefaultUploadPresetOptionId(makeReadout({ source: "instance", presetId: "preset-instance" }));
    expect(id).toBe("preset:preset-instance");
  });
});

describe("resolveAutoUploadPresetOptionId", () => {
  const available = new Set(["preset:preset-instance", "manual-override"]);

  it("returns null while target resolution is pending", () => {
    expect(
      resolveAutoUploadPresetOptionId({
        currentOptionId: "",
        userPicked: false,
        readout: makeReadout({ source: "instance", presetId: "preset-instance" }),
        availableOptionIds: available,
        targetResolutionSettled: false,
      })
    ).toBeNull();
  });

  it("defaults to resolved preset after target settles", () => {
    expect(
      resolveAutoUploadPresetOptionId({
        currentOptionId: "manual-override",
        userPicked: false,
        readout: makeReadout({ source: "instance", presetId: "preset-instance" }),
        availableOptionIds: available,
        targetResolutionSettled: true,
      })
    ).toBe("preset:preset-instance");
  });

  it("preserves manual override after explicit user selection", () => {
    expect(
      resolveAutoUploadPresetOptionId({
        currentOptionId: "manual-override",
        userPicked: true,
        readout: makeReadout({ source: "instance", presetId: "preset-instance" }),
        availableOptionIds: available,
        targetResolutionSettled: true,
      })
    ).toBe("manual-override");
  });
});

describe("isUploadPresetExportFormatLocked", () => {
  it("locks format for resolved preset with configured export format", () => {
    expect(
      isUploadPresetExportFormatLocked({
        id: "preset:preset-instance",
        label: "Instance",
        scope: "instance",
        constraints: null,
        exportFormatConfigured: true,
      })
    ).toBe(true);
  });

  it("does not lock format for manual override", () => {
    expect(
      isUploadPresetExportFormatLocked({
        id: "manual-override",
        label: "Manual override",
        scope: "manual",
        constraints: null,
        exportFormatConfigured: false,
      })
    ).toBe(false);
  });

  it("does not lock format when preset uses workspace default format", () => {
    expect(
      isUploadPresetExportFormatLocked({
        id: "preset:preset-instance",
        label: "Instance",
        scope: "instance",
        constraints: null,
        exportFormatConfigured: false,
      })
    ).toBe(false);
  });
});
