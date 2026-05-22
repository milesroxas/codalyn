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
});
