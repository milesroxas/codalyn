import type { BeaconPresetStorageEntry } from "@codalyn/webflow-kit";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  cleanupDesignerTagsForPresetEntry,
  presetDeleteRequiresDesignerCleanup,
} from "./image-editor-preset-delete-cleanup";

vi.mock("@/features/image-editor/lib/apply-beacon-designer-export-attrs-to-target", () => ({
  clearBeaconDesignerExportAttrsOnPageTarget: vi.fn().mockResolvedValue(undefined),
  clearBeaconDesignerExportAttrsOnComponentDefinition: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/image-editor/lib/locate-preset-target", () => ({
  findImagePageTargetForPresetOnCurrentPage: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/shared/lib/webflow-page-canvas-context", () => ({
  ensurePageCanvas: vi.fn().mockResolvedValue("page_1"),
}));

describe("presetDeleteRequiresDesignerCleanup", () => {
  it("requires cleanup for instance and component presets", () => {
    expect(presetDeleteRequiresDesignerCleanup("instance")).toBe(true);
    expect(presetDeleteRequiresDesignerCleanup("component")).toBe(true);
    expect(presetDeleteRequiresDesignerCleanup("element")).toBe(false);
    expect(presetDeleteRequiresDesignerCleanup("site-default")).toBe(false);
  });
});

describe("cleanupDesignerTagsForPresetEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips Designer work for site-default presets", async () => {
    const entry: BeaconPresetStorageEntry = {
      scope: "site-default",
      row: {
        id: "preset_1",
        name: "Default",
        width: 1200,
        height: 800,
        maxFileSizeBytes: 200_000,
        targetKey: { kind: "site-default", siteId: "site_1" },
      },
    };

    await expect(cleanupDesignerTagsForPresetEntry({ entry, pageIdHint: "page_1" })).resolves.toEqual({
      ok: true,
      cleaned: false,
    });
  });

  it("clears component definition defaults for component presets", async () => {
    const { clearBeaconDesignerExportAttrsOnComponentDefinition } = await import(
      "@/features/image-editor/lib/apply-beacon-designer-export-attrs-to-target"
    );

    const entry: BeaconPresetStorageEntry = {
      scope: "component",
      row: {
        id: "preset_1",
        name: "Hero",
        width: 1200,
        height: 800,
        maxFileSizeBytes: 200_000,
        targetKey: {
          kind: "component-image",
          siteId: "site_1",
          componentDefinitionId: "cmp_1",
          imagePropId: "hero-image",
        },
      },
    };

    await expect(cleanupDesignerTagsForPresetEntry({ entry, pageIdHint: "page_1" })).resolves.toEqual({
      ok: true,
      cleaned: true,
    });
    expect(clearBeaconDesignerExportAttrsOnComponentDefinition).toHaveBeenCalledWith({
      componentDefinitionId: "cmp_1",
      pageIdHint: "page_1",
    });
  });
});
