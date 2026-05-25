import type { BeaconAppSettings } from "@codalyn/webflow-kit";
import { serializePresetTargetKey } from "@codalyn/webflow-kit";
import { describe, expect, it } from "vitest";

import {
  findExistingPresetForFormScope,
  listAddablePresetScopesForFormTarget,
  listExistingPresetsForFormTarget,
  presetFormExistingMatchToListRow,
} from "./image-editor-preset-form-existing";

function makeSettings(partial?: Partial<BeaconAppSettings["imagePresetStorage"]>): BeaconAppSettings {
  return {
    defaultExportFormat: "webp",
    defaultExportQuality: 0.72,
    imagePresetStorage: {
      siteDefault: null,
      byTargetKey: {},
      ...partial,
    },
  } as BeaconAppSettings;
}

describe("findExistingPresetForFormScope", () => {
  it("returns site default preset for site-default scope", () => {
    const settings = makeSettings({
      siteDefault: {
        id: "site_row",
        name: "Site hero",
        width: 1600,
        height: 900,
        maxFileSizeBytes: 200_000,
        targetKey: { kind: "site-default", siteId: "site_1" },
      },
    });
    const match = findExistingPresetForFormScope({
      settings,
      scope: "site-default",
      siteId: "site_1",
      resolvedTarget: null,
    });
    expect(match?.row.id).toBe("site_row");
    expect(match?.displayName).toContain("Site hero");
  });

  it("returns instance preset for resolved bare-image target", () => {
    const targetKey = {
      kind: "bare-image-instance" as const,
      siteId: "site_1",
      pageId: "page_1",
      elementId: "img_1",
    };
    const settings = makeSettings({
      byTargetKey: {
        [serializePresetTargetKey(targetKey)]: {
          id: "instance_row",
          name: "Card",
          width: 800,
          height: 600,
          maxFileSizeBytes: 200_000,
          targetKey,
        },
      },
    });
    const match = findExistingPresetForFormScope({
      settings,
      scope: "instance",
      siteId: "site_1",
      resolvedTarget: {
        kind: "bare-image",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
        tagged: null,
      },
    });
    expect(match?.row.id).toBe("instance_row");
  });
});

describe("listExistingPresetsForFormTarget", () => {
  it("lists enabled scopes that already have presets", () => {
    const targetKey = {
      kind: "bare-image-instance" as const,
      siteId: "site_1",
      pageId: "page_1",
      elementId: "img_1",
    };
    const settings = makeSettings({
      byTargetKey: {
        [serializePresetTargetKey(targetKey)]: {
          id: "instance_row",
          name: "Card",
          width: 800,
          height: 600,
          maxFileSizeBytes: 200_000,
          targetKey,
        },
      },
    });
    const matches = listExistingPresetsForFormTarget({
      settings,
      siteId: "site_1",
      resolvedTarget: {
        kind: "bare-image",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
        tagged: null,
      },
      scopeOptions: [
        { scope: "instance", enabled: true },
        { scope: "element", enabled: true },
        { scope: "component", enabled: false },
      ],
    });
    expect(matches.map((match) => match.scope)).toEqual(["instance"]);
  });

  it("falls back to site default when no surface presets exist", () => {
    const settings = makeSettings({
      siteDefault: {
        id: "site_row",
        name: "Site hero",
        width: 1600,
        height: 900,
        maxFileSizeBytes: 200_000,
        targetKey: { kind: "site-default", siteId: "site_1" },
      },
    });
    const matches = listExistingPresetsForFormTarget({
      settings,
      siteId: "site_1",
      resolvedTarget: {
        kind: "bare-image",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
        tagged: null,
      },
      scopeOptions: [
        { scope: "site-default", enabled: true },
        { scope: "instance", enabled: true },
        { scope: "element", enabled: true },
      ],
    });
    expect(matches).toEqual([
      expect.objectContaining({
        scope: "site-default",
        row: expect.objectContaining({ id: "site_row" }),
      }),
    ]);
  });

  it("prefers surface presets over site default fallback", () => {
    const targetKey = {
      kind: "bare-image-instance" as const,
      siteId: "site_1",
      pageId: "page_1",
      elementId: "img_1",
    };
    const settings = makeSettings({
      siteDefault: {
        id: "site_row",
        name: "Site hero",
        width: 1600,
        height: 900,
        maxFileSizeBytes: 200_000,
        targetKey: { kind: "site-default", siteId: "site_1" },
      },
      byTargetKey: {
        [serializePresetTargetKey(targetKey)]: {
          id: "instance_row",
          name: "Card",
          width: 800,
          height: 600,
          maxFileSizeBytes: 200_000,
          targetKey,
        },
      },
    });
    const matches = listExistingPresetsForFormTarget({
      settings,
      siteId: "site_1",
      resolvedTarget: {
        kind: "bare-image",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
        tagged: null,
      },
      scopeOptions: [
        { scope: "site-default", enabled: true },
        { scope: "instance", enabled: true },
        { scope: "element", enabled: true },
      ],
    });
    expect(matches.map((match) => match.scope)).toEqual(["instance"]);
  });
});

describe("listAddablePresetScopesForFormTarget", () => {
  it("returns enabled scopes without existing presets", () => {
    const addable = listAddablePresetScopesForFormTarget({
      scopeOptions: [
        { scope: "instance", enabled: true, label: "Instance preset" },
        { scope: "component", enabled: true, label: "Component preset" },
        { scope: "element", enabled: false, label: "Element preset" },
      ],
      existingPresets: [
        {
          scope: "component",
          row: {
            id: "component_row",
            name: "Card",
            width: 800,
            height: 600,
            maxFileSizeBytes: 200_000,
            targetKey: {
              kind: "component-image",
              siteId: "site_1",
              componentDefinitionId: "cmp_1",
              imagePropId: "prop_1",
            },
          },
          displayName: "Card (Component)",
          dimensionsLabel: "800×600px",
        },
      ],
    });
    expect(addable).toEqual([{ scope: "instance", label: "Instance preset" }]);
  });

  it("does not offer site default as a surface create option", () => {
    const addable = listAddablePresetScopesForFormTarget({
      scopeOptions: [
        { scope: "site-default", enabled: true, label: "Site default preset" },
        { scope: "instance", enabled: true, label: "Instance preset" },
      ],
      existingPresets: [],
    });
    expect(addable).toEqual([{ scope: "instance", label: "Instance preset" }]);
  });
});

describe("presetFormExistingMatchToListRow", () => {
  it("maps an existing match into a preset list row", () => {
    const row = presetFormExistingMatchToListRow({
      scope: "instance",
      row: {
        id: "row_1",
        name: "Hero",
        width: 1200,
        height: 800,
        exportFormat: "webp",
        maxFileSizeBytes: 200_000,
        targetKey: {
          kind: "bare-image-instance",
          siteId: "site_1",
          pageId: "page_1",
          elementId: "img_1",
        },
      },
      displayName: "Hero (Instance)",
      dimensionsLabel: "1200×800px",
    });
    expect(row.id).toBe("row_1");
    expect(row.scope).toBe("instance");
    expect(row.displayName).toBe("Hero (Instance)");
  });
});
