import type { BeaconPresetStorageEntry } from "@codalyn/webflow-kit";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { cleanupDesignerTagsForPresetEntry } from "./image-editor-preset-delete-cleanup";

vi.mock("@/features/image-editor/lib/apply-beacon-designer-export-attrs-to-target", () => ({
  clearBeaconDesignerExportAttrsOnComponentDefinition: vi.fn().mockResolvedValue(undefined),
  clearBeaconDesignerExportAttrsOnPageTarget: vi.fn().mockResolvedValue(undefined),
  removeBeaconDesignerExportPropsFromComponentDefinition: vi.fn().mockResolvedValue(undefined),
}));

function componentPresetEntry(overrides?: {
  componentDefinitionId?: string;
  imagePropId?: string;
}): BeaconPresetStorageEntry {
  return {
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
        componentDefinitionId: overrides?.componentDefinitionId ?? "cmp_1",
        imagePropId: overrides?.imagePropId ?? "hero-image",
      },
    },
  };
}

vi.mock("@/features/image-editor/lib/locate-preset-target", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./locate-preset-target")>();
  return {
    ...actual,
    findImagePageTargetForPresetOnCurrentPage: vi.fn().mockResolvedValue(null),
  };
});

vi.mock("@/features/image-editor/lib/page-component-instance-for-preset-work", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./page-component-instance-for-preset-work")>();
  return {
    ...actual,
    withPageComponentInstanceForDefinitionWork: vi.fn(async (_input) => undefined),
  };
});

vi.mock("@/shared/lib/component-definition-scope", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/component-definition-scope")>();
  return {
    ...actual,
    preparePageCanvasForWork: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/shared/lib/webflow-page-canvas-context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/webflow-page-canvas-context")>();
  return {
    ...actual,
    ensurePageCanvas: vi.fn(async (pageIdHint: string | null) => pageIdHint),
  };
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

    await expect(cleanupDesignerTagsForPresetEntry({ entry, remaining: [], pageIdHint: "page_1" })).resolves.toEqual({
      ok: true,
      cleaned: false,
    });
  });

  it("clears page target tags for instance presets", async () => {
    const { clearBeaconDesignerExportAttrsOnPageTarget } = await import(
      "@/features/image-editor/lib/apply-beacon-designer-export-attrs-to-target"
    );
    const { findImagePageTargetForPresetOnCurrentPage } = await import(
      "@/features/image-editor/lib/locate-preset-target"
    );
    const { preparePageCanvasForWork } = await import("@/shared/lib/component-definition-scope");

    const target = {
      id: "locate-image-img_1",
      kind: "image" as const,
      element: { type: "Image" } as AnyElement,
      label: "Image",
    };
    vi.mocked(findImagePageTargetForPresetOnCurrentPage).mockResolvedValueOnce(target);

    const entry: BeaconPresetStorageEntry = {
      scope: "instance",
      row: {
        id: "preset_1",
        name: "Hero",
        width: 1200,
        height: 800,
        maxFileSizeBytes: 200_000,
        targetKey: {
          kind: "bare-image-instance",
          siteId: "site_1",
          pageId: "page_1",
          elementId: "img_1",
        },
      },
    };

    await expect(cleanupDesignerTagsForPresetEntry({ entry, remaining: [], pageIdHint: "page_2" })).resolves.toEqual({
      ok: true,
      cleaned: true,
    });
    expect(preparePageCanvasForWork).toHaveBeenCalledWith("page_1");
    expect(clearBeaconDesignerExportAttrsOnPageTarget).toHaveBeenCalledWith(target, {
      writeMode: "instance-props",
      pageIdHint: "page_2",
    });
  });

  it("removes component props when no other preset references the definition", async () => {
    const {
      clearBeaconDesignerExportAttrsOnComponentDefinition,
      removeBeaconDesignerExportPropsFromComponentDefinition,
    } = await import("@/features/image-editor/lib/apply-beacon-designer-export-attrs-to-target");
    const { findImagePageTargetForPresetOnCurrentPage } = await import(
      "@/features/image-editor/lib/locate-preset-target"
    );

    const entry = componentPresetEntry();

    await expect(cleanupDesignerTagsForPresetEntry({ entry, remaining: [], pageIdHint: "page_1" })).resolves.toEqual({
      ok: true,
      cleaned: true,
    });
    expect(findImagePageTargetForPresetOnCurrentPage).not.toHaveBeenCalled();
    expect(removeBeaconDesignerExportPropsFromComponentDefinition).toHaveBeenCalledWith("cmp_1", {
      pageIdHint: "page_1",
      instance: null,
    });
    expect(clearBeaconDesignerExportAttrsOnComponentDefinition).not.toHaveBeenCalled();
  });

  it("reuses a placed component instance when removing component props", async () => {
    const { removeBeaconDesignerExportPropsFromComponentDefinition } = await import(
      "@/features/image-editor/lib/apply-beacon-designer-export-attrs-to-target"
    );
    const instance = { type: "ComponentInstance" } as ComponentElement;

    const entry = componentPresetEntry();

    await expect(
      cleanupDesignerTagsForPresetEntry({ entry, remaining: [], pageIdHint: "page_1", componentInstance: instance })
    ).resolves.toEqual({
      ok: true,
      cleaned: true,
    });
    expect(removeBeaconDesignerExportPropsFromComponentDefinition).toHaveBeenCalledWith("cmp_1", {
      pageIdHint: "page_1",
      instance,
    });
  });

  it("clears values (keeps props) when another preset still shares the same component definition", async () => {
    const {
      clearBeaconDesignerExportAttrsOnComponentDefinition,
      removeBeaconDesignerExportPropsFromComponentDefinition,
    } = await import("@/features/image-editor/lib/apply-beacon-designer-export-attrs-to-target");

    const entry = componentPresetEntry();
    // A sibling component preset for the same definition (different image field) still needs the props.
    const sibling = componentPresetEntry({ imagePropId: "logo-image" });
    sibling.row.id = "preset_2";

    await expect(
      cleanupDesignerTagsForPresetEntry({ entry, remaining: [sibling], pageIdHint: "page_1" })
    ).resolves.toEqual({ ok: true, cleaned: true });
    expect(clearBeaconDesignerExportAttrsOnComponentDefinition).toHaveBeenCalledWith("cmp_1", {
      pageIdHint: "page_1",
      instance: null,
    });
    expect(removeBeaconDesignerExportPropsFromComponentDefinition).not.toHaveBeenCalled();
  });

  it("clears values (keeps props) when any component-instance preset remains", async () => {
    const {
      clearBeaconDesignerExportAttrsOnComponentDefinition,
      removeBeaconDesignerExportPropsFromComponentDefinition,
    } = await import("@/features/image-editor/lib/apply-beacon-designer-export-attrs-to-target");

    const entry = componentPresetEntry();
    const instancePreset: BeaconPresetStorageEntry = {
      scope: "instance",
      row: {
        id: "preset_2",
        name: "Card",
        width: 600,
        height: 400,
        maxFileSizeBytes: 200_000,
        targetKey: {
          kind: "component-image-instance",
          siteId: "site_1",
          pageId: "page_9",
          instanceElementId: "inst_9",
          imagePropId: "card-image",
        },
      },
    };

    await expect(
      cleanupDesignerTagsForPresetEntry({ entry, remaining: [instancePreset], pageIdHint: "page_1" })
    ).resolves.toEqual({ ok: true, cleaned: true });
    expect(clearBeaconDesignerExportAttrsOnComponentDefinition).toHaveBeenCalledWith("cmp_1", {
      pageIdHint: "page_1",
      instance: null,
    });
    expect(removeBeaconDesignerExportPropsFromComponentDefinition).not.toHaveBeenCalled();
  });
});
