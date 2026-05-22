/** @vitest-environment jsdom */
import {
  type BeaconAppSettings,
  getDefaultBeaconAppSettings,
  type ResolvedUploadTarget,
  serializePresetTargetKey,
} from "@codalyn/webflow-kit";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useResolvedExportConstraints } from "./use-resolved-export-constraints";

function withV2Settings(patch: Partial<BeaconAppSettings>): BeaconAppSettings {
  return {
    ...getDefaultBeaconAppSettings(),
    ...patch,
  };
}

describe("useResolvedExportConstraints", () => {
  it("returns null when beaconPresetV2Read is disabled", () => {
    const settings = withV2Settings({});
    const target: ResolvedUploadTarget = {
      kind: "bare-image",
      siteId: "site-1",
      pageId: "page-1",
      elementId: "img-1",
      tagged: { width: 1200, height: 800 },
    };
    const { result } = renderHook(() => useResolvedExportConstraints({ enabled: false, settings, target }));
    expect(result.current).toBeNull();
  });

  it("returns tagged source readout for tagged target", () => {
    const settings = withV2Settings({});
    const target: ResolvedUploadTarget = {
      kind: "bare-image",
      siteId: "site-1",
      pageId: "page-1",
      elementId: "img-1",
      tagged: { width: 1200, height: 800 },
    };
    const { result } = renderHook(() => useResolvedExportConstraints({ enabled: true, settings, target }));
    expect(result.current?.source).toBe("tagged");
    expect(result.current?.constraints?.width).toBeGreaterThan(0);
    expect(result.current?.constraints?.height).toBeGreaterThan(0);
  });

  it("returns site-default source when untagged bare image has site default", () => {
    const siteDefaultRow = {
      id: "preset-site-default",
      name: "Site default",
      width: 1600,
      height: 900,
      exportFormat: "webp" as const,
      maxFileSizeBytes: 120_000,
      targetKey: { kind: "bare-image-element" as const, siteId: "site-1" },
    };
    const settings = withV2Settings({
      imagePresetStorageV2: {
        siteDefault: siteDefaultRow,
        byTargetKey: {},
      },
    });
    const target: ResolvedUploadTarget = {
      kind: "bare-image",
      siteId: "site-1",
      pageId: "page-1",
      elementId: "img-1",
      tagged: null,
    };
    const { result } = renderHook(() => useResolvedExportConstraints({ enabled: true, settings, target }));
    expect(result.current?.source).toBe("site-default");
    expect(result.current?.constraints?.width).toBe(1600);
    expect(result.current?.constraints?.height).toBe(900);
  });

  it("returns component source when component preset matches", () => {
    const key = serializePresetTargetKey({
      kind: "component-image",
      siteId: "site-1",
      componentDefinitionId: "cmp-def",
      imagePropId: "hero-image",
    });
    const row = {
      id: "preset-component",
      name: "Component preset",
      width: 900,
      height: 600,
      exportFormat: "avif" as const,
      maxFileSizeBytes: 90_000,
      targetKey: {
        kind: "component-image" as const,
        siteId: "site-1",
        componentDefinitionId: "cmp-def",
        imagePropId: "hero-image",
      },
    };
    const settings = withV2Settings({
      imagePresetStorageV2: {
        siteDefault: null,
        byTargetKey: { [key]: row },
      },
    });
    const target: ResolvedUploadTarget = {
      kind: "component-image",
      siteId: "site-1",
      pageId: "page-1",
      instanceElementId: "inst-1",
      componentDefinitionId: "cmp-def",
      imagePropId: "hero-image",
      tagged: null,
    };
    const { result } = renderHook(() => useResolvedExportConstraints({ enabled: true, settings, target }));
    expect(result.current?.source).toBe("component");
    expect(result.current?.constraints?.width).toBe(900);
    expect(result.current?.constraints?.height).toBe(600);
  });

  it("prefers bare-image instance preset over bare-image element preset", () => {
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
    const settings = withV2Settings({
      imagePresetStorageV2: {
        siteDefault: null,
        byTargetKey: {
          [instanceKey]: {
            id: "preset-instance",
            name: "Instance",
            width: 1440,
            height: 810,
            exportFormat: "webp",
            maxFileSizeBytes: 150_000,
            targetKey: { kind: "bare-image-instance", siteId: "site-1", pageId: "page-1", elementId: "img-1" },
          },
          [elementKey]: {
            id: "preset-element",
            name: "Element",
            width: 900,
            height: 600,
            exportFormat: "webp",
            maxFileSizeBytes: 90_000,
            targetKey: { kind: "bare-image-element", siteId: "site-1" },
          },
        },
      },
    });
    const target: ResolvedUploadTarget = {
      kind: "bare-image",
      siteId: "site-1",
      pageId: "page-1",
      elementId: "img-1",
      tagged: null,
    };
    const { result } = renderHook(() => useResolvedExportConstraints({ enabled: true, settings, target }));
    expect(result.current?.source).toBe("instance");
    expect(result.current?.constraints?.width).toBe(1440);
    expect(result.current?.constraints?.height).toBe(810);
  });

  it("uses tagged width/height while taking format and max-file-size from preset sub-resolution", () => {
    const instanceKey = serializePresetTargetKey({
      kind: "bare-image-instance",
      siteId: "site-1",
      pageId: "page-1",
      elementId: "img-1",
    });
    const settings = withV2Settings({
      defaultExportFormat: "webp",
      imagePresetStorageV2: {
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
    const target: ResolvedUploadTarget = {
      kind: "bare-image",
      siteId: "site-1",
      pageId: "page-1",
      elementId: "img-1",
      tagged: { width: 1200, height: 800 },
    };
    const { result } = renderHook(() => useResolvedExportConstraints({ enabled: true, settings, target }));
    expect(result.current?.source).toBe("tagged");
    expect(result.current?.constraints?.width).toBe(1200);
    expect(result.current?.constraints?.height).toBe(800);
    expect(result.current?.constraints?.exportFormat).toBe("avif");
    expect(result.current?.constraints?.maxFileSizeBytes).toBe(88_000);
  });

  it("prefers component-image instance preset over component preset", () => {
    const instanceKey = serializePresetTargetKey({
      kind: "component-image-instance",
      siteId: "site-1",
      pageId: "page-1",
      instanceElementId: "inst-1",
      imagePropId: "hero-image",
    });
    const componentKey = serializePresetTargetKey({
      kind: "component-image",
      siteId: "site-1",
      componentDefinitionId: "cmp-def",
      imagePropId: "hero-image",
    });
    const settings = withV2Settings({
      imagePresetStorageV2: {
        siteDefault: null,
        byTargetKey: {
          [instanceKey]: {
            id: "preset-component-instance",
            name: "Component instance",
            width: 1100,
            height: 733,
            exportFormat: "avif",
            maxFileSizeBytes: 95_000,
            targetKey: {
              kind: "component-image-instance",
              siteId: "site-1",
              pageId: "page-1",
              instanceElementId: "inst-1",
              imagePropId: "hero-image",
            },
          },
          [componentKey]: {
            id: "preset-component",
            name: "Component",
            width: 800,
            height: 533,
            exportFormat: "webp",
            maxFileSizeBytes: 120_000,
            targetKey: {
              kind: "component-image",
              siteId: "site-1",
              componentDefinitionId: "cmp-def",
              imagePropId: "hero-image",
            },
          },
        },
      },
    });
    const target: ResolvedUploadTarget = {
      kind: "component-image",
      siteId: "site-1",
      pageId: "page-1",
      instanceElementId: "inst-1",
      componentDefinitionId: "cmp-def",
      imagePropId: "hero-image",
      tagged: null,
    };
    const { result } = renderHook(() => useResolvedExportConstraints({ enabled: true, settings, target }));
    expect(result.current?.source).toBe("instance");
    expect(result.current?.constraints?.width).toBe(1100);
    expect(result.current?.constraints?.height).toBe(733);
  });

  it("uses component preset over site default when component instance preset is absent", () => {
    const componentKey = serializePresetTargetKey({
      kind: "component-image",
      siteId: "site-1",
      componentDefinitionId: "cmp-def",
      imagePropId: "hero-image",
    });
    const settings = withV2Settings({
      imagePresetStorageV2: {
        siteDefault: {
          id: "preset-site-default",
          name: "Site default",
          width: 1600,
          height: 900,
          exportFormat: "webp",
          maxFileSizeBytes: 130_000,
          targetKey: { kind: "bare-image-element", siteId: "site-1" },
        },
        byTargetKey: {
          [componentKey]: {
            id: "preset-component",
            name: "Component",
            width: 800,
            height: 533,
            exportFormat: "avif",
            maxFileSizeBytes: 100_000,
            targetKey: {
              kind: "component-image",
              siteId: "site-1",
              componentDefinitionId: "cmp-def",
              imagePropId: "hero-image",
            },
          },
        },
      },
    });
    const target: ResolvedUploadTarget = {
      kind: "component-image",
      siteId: "site-1",
      pageId: "page-1",
      instanceElementId: "inst-9",
      componentDefinitionId: "cmp-def",
      imagePropId: "hero-image",
      tagged: null,
    };
    const { result } = renderHook(() => useResolvedExportConstraints({ enabled: true, settings, target }));
    expect(result.current?.source).toBe("component");
    expect(result.current?.constraints?.width).toBe(800);
    expect(result.current?.constraints?.height).toBe(533);
  });

  it("returns manual fallback when no tagged dimensions and no matching presets exist", () => {
    const settings = withV2Settings({});
    const target: ResolvedUploadTarget = {
      kind: "bare-image",
      siteId: "site-1",
      pageId: "page-1",
      elementId: "img-1",
      tagged: null,
    };
    const { result } = renderHook(() => useResolvedExportConstraints({ enabled: true, settings, target }));
    expect(result.current?.source).toBe("manual");
    expect(result.current?.constraints).toBeNull();
  });

  it("returns ambiguous cms blocker output for cms-ambiguous target", () => {
    const settings = withV2Settings({});
    const target: ResolvedUploadTarget = {
      kind: "cms-ambiguous",
      siteId: "site-1",
    };
    const { result } = renderHook(() => useResolvedExportConstraints({ enabled: true, settings, target }));
    expect(result.current?.source).toBe("manual");
    expect(result.current?.constraints).toBeNull();
    expect(result.current?.blockers).toEqual(["ambiguous-cms-binding"]);
  });
});
