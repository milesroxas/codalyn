import type { BeaconPresetStorageEntry } from "@codalyn/webflow-kit";
import { describe, expect, it } from "vitest";

import {
  IMAGE_UPLOAD_PRESET_EDIT_INSTANCE_MISMATCH_MESSAGE,
  IMAGE_UPLOAD_PRESET_EDIT_INSTANCE_TARGET_REQUIRED_MESSAGE,
} from "@/shared/lib/beacon-feature-route-copy";
import {
  presetScopeWritesDesignerTags,
  readComponentDefinitionTagTarget,
  shouldTagComponentDefinitionOnPresetSave,
  shouldTagPageTargetOnPresetSave,
  validateInstancePresetEditTarget,
} from "./image-editor-preset-form-commit";

describe("shouldTagPageTargetOnPresetSave", () => {
  it("tags only instance presets", () => {
    expect(shouldTagPageTargetOnPresetSave("instance")).toBe(true);
    expect(shouldTagPageTargetOnPresetSave("component")).toBe(false);
    expect(shouldTagPageTargetOnPresetSave("element")).toBe(false);
    expect(shouldTagPageTargetOnPresetSave("site-default")).toBe(false);
  });
});

describe("shouldTagComponentDefinitionOnPresetSave", () => {
  it("tags only component presets on the library definition", () => {
    expect(shouldTagComponentDefinitionOnPresetSave("component")).toBe(true);
    expect(shouldTagComponentDefinitionOnPresetSave("instance")).toBe(false);
    expect(shouldTagComponentDefinitionOnPresetSave("element")).toBe(false);
    expect(shouldTagComponentDefinitionOnPresetSave("site-default")).toBe(false);
  });
});

describe("presetScopeWritesDesignerTags", () => {
  it("matches instance and component save tagging scopes", () => {
    expect(presetScopeWritesDesignerTags("instance")).toBe(true);
    expect(presetScopeWritesDesignerTags("component")).toBe(true);
    expect(presetScopeWritesDesignerTags("element")).toBe(false);
    expect(presetScopeWritesDesignerTags("site-default")).toBe(false);
  });
});

describe("readComponentDefinitionTagTarget", () => {
  it("reads from an existing component preset row when editing", () => {
    expect(
      readComponentDefinitionTagTarget({
        presetScope: "component",
        editingEntry: {
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
        },
        resolvedTargetForScope: null,
      })
    ).toEqual({ componentDefinitionId: "cmp_1", imagePropId: "hero-image" });
  });

  it("reads from a resolved upload target when creating", () => {
    expect(
      readComponentDefinitionTagTarget({
        presetScope: "component",
        editingEntry: null,
        resolvedTargetForScope: {
          kind: "component-image",
          siteId: "site_1",
          pageId: "page_1",
          instanceElementId: "inst_1",
          componentDefinitionId: "cmp_1",
          imagePropId: "hero-image",
          tagged: null,
        },
      })
    ).toEqual({ componentDefinitionId: "cmp_1", imagePropId: "hero-image" });
  });
});

describe("validateInstancePresetEditTarget", () => {
  const instanceEntry: BeaconPresetStorageEntry = {
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

  it("requires a resolved target when editing an instance preset", () => {
    expect(
      validateInstancePresetEditTarget({
        editingEntry: instanceEntry,
        resolvedTargetForScope: null,
      })
    ).toBe(IMAGE_UPLOAD_PRESET_EDIT_INSTANCE_TARGET_REQUIRED_MESSAGE);
  });

  it("rejects a resolved target that does not match the saved instance key", () => {
    expect(
      validateInstancePresetEditTarget({
        editingEntry: instanceEntry,
        resolvedTargetForScope: {
          kind: "bare-image",
          siteId: "site_1",
          pageId: "page_1",
          elementId: "img_2",
          tagged: null,
        },
      })
    ).toBe(IMAGE_UPLOAD_PRESET_EDIT_INSTANCE_MISMATCH_MESSAGE);
  });

  it("accepts a matching resolved target", () => {
    expect(
      validateInstancePresetEditTarget({
        editingEntry: instanceEntry,
        resolvedTargetForScope: {
          kind: "bare-image",
          siteId: "site_1",
          pageId: "page_1",
          elementId: "img_1",
          tagged: null,
        },
      })
    ).toBeNull();
  });

  it("skips validation for non-instance edits", () => {
    expect(
      validateInstancePresetEditTarget({
        editingEntry: {
          scope: "site-default",
          row: {
            id: "site_row",
            name: "Default",
            width: 1200,
            height: 800,
            maxFileSizeBytes: 200_000,
            targetKey: { kind: "site-default", siteId: "site_1" },
          },
        },
        resolvedTargetForScope: null,
      })
    ).toBeNull();
  });
});
