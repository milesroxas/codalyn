import { describe, expect, it } from "vitest";

import {
  applyBeaconPresetRowUpsert,
  applySiteDefaultPresetPatch,
  type BeaconPresetRow,
  type BeaconPresetSettingsSnapshot,
  type BeaconPresetStorageEntry,
  buildBeaconPresetSiteGroups,
  buildPresetTargetKeyForScope,
  coalesceBeaconPresetStorage,
  createBeaconPresetResolver,
  createSiteDefaultPresetTargetKey,
  doesResolvedUploadTargetMatchPresetTargetKey,
  findBeaconPresetRowByTargetKey,
  formatBeaconPresetDisplayName,
  formatBeaconPresetInstanceLocationLabel,
  inferPresetCrudScopeFromTargetKey,
  isInstancePresetTargetKey,
  listBeaconPresetStorageEntries,
  type PresetTargetKey,
  removeBeaconPresetRowById,
  resolveRemovableComponentExportProps,
  resolveSiteDefaultPresetRow,
  serializePresetTargetKey,
} from "./beacon-image-preset-domain.js";

function makeRow(partial: Partial<BeaconPresetRow> & Pick<BeaconPresetRow, "id" | "targetKey">): BeaconPresetRow {
  return {
    id: partial.id,
    targetKey: partial.targetKey,
    name: partial.name ?? partial.id,
    width: partial.width ?? 1200,
    height: partial.height ?? 800,
    exportFormat: partial.exportFormat,
    maxFileSizeBytes: partial.maxFileSizeBytes ?? 200_000,
  };
}

function makeSettings(
  rows: BeaconPresetRow[],
  siteDefault: BeaconPresetRow | null = null
): BeaconPresetSettingsSnapshot {
  const byTargetKey = new Map(rows.map((row) => [serializePresetTargetKey(row.targetKey), row]));
  return {
    siteDefault,
    byTargetKey,
    defaults: {
      exportFormat: "webp",
      exportQuality: 0.72,
    },
  };
}

describe("createBeaconPresetResolver", () => {
  const resolver = createBeaconPresetResolver();

  it("tagged width and height wins", () => {
    const instance = makeRow({
      id: "inst",
      targetKey: {
        kind: "bare-image-instance",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
      },
      width: 800,
      height: 600,
    });
    const output = resolver.resolve({
      settings: makeSettings([instance]),
      target: {
        kind: "bare-image",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
        tagged: { width: 2000, height: 1200 },
      },
    });
    expect(output.source).toBe("tagged");
    expect(output.constraints?.width).toBe(2000);
    expect(output.constraints?.height).toBe(1200);
  });

  it("tagged dimensions use preset format and max-size from lower priority path", () => {
    const instance = makeRow({
      id: "inst",
      targetKey: {
        kind: "bare-image-instance",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
      },
      exportFormat: "avif",
      maxFileSizeBytes: 321_000,
    });
    const output = resolver.resolve({
      settings: makeSettings([instance]),
      target: {
        kind: "bare-image",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
        tagged: { width: 6000, height: 3000 },
      },
    });
    expect(output.source).toBe("tagged");
    expect(output.presetId).toBe("inst");
    expect(output.constraints).toEqual({
      width: 2560,
      height: 1280,
      exportFormat: "avif",
      maxFileSizeBytes: 321_000,
      quality: 0.72,
    });
  });

  it("uses bare-image instance preset", () => {
    const output = resolver.resolve({
      settings: makeSettings([
        makeRow({
          id: "inst",
          targetKey: {
            kind: "bare-image-instance",
            siteId: "site_1",
            pageId: "page_1",
            elementId: "img_1",
          },
          width: 111,
          height: 222,
        }),
      ]),
      target: {
        kind: "bare-image",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
        tagged: null,
      },
    });
    expect(output.source).toBe("instance");
    expect(output.constraints?.width).toBe(111);
    expect(output.constraints?.height).toBe(222);
  });

  it("uses component-image instance preset", () => {
    const output = resolver.resolve({
      settings: makeSettings([
        makeRow({
          id: "inst",
          targetKey: {
            kind: "component-image-instance",
            siteId: "site_1",
            pageId: "page_1",
            instanceElementId: "comp_inst_1",
            imagePropId: "prop_1",
          },
          width: 333,
          height: 444,
        }),
      ]),
      target: {
        kind: "component-image",
        siteId: "site_1",
        pageId: "page_1",
        instanceElementId: "comp_inst_1",
        componentDefinitionId: "comp_def_1",
        imagePropId: "prop_1",
        tagged: null,
      },
    });
    expect(output.source).toBe("instance");
    expect(output.constraints?.width).toBe(333);
    expect(output.constraints?.height).toBe(444);
  });

  it("falls back to component preset", () => {
    const output = resolver.resolve({
      settings: makeSettings([
        makeRow({
          id: "component",
          targetKey: {
            kind: "component-image",
            siteId: "site_1",
            componentDefinitionId: "comp_def_1",
            imagePropId: "prop_1",
          },
          width: 777,
          height: 555,
        }),
      ]),
      target: {
        kind: "component-image",
        siteId: "site_1",
        pageId: "page_1",
        instanceElementId: "comp_inst_1",
        componentDefinitionId: "comp_def_1",
        imagePropId: "prop_1",
        tagged: null,
      },
    });
    expect(output.source).toBe("component");
    expect(output.presetId).toBe("component");
    expect(output.constraints?.width).toBe(777);
    expect(output.constraints?.height).toBe(555);
  });

  it("falls back to element preset for bare images", () => {
    const output = resolver.resolve({
      settings: makeSettings([
        makeRow({
          id: "element",
          targetKey: {
            kind: "bare-image-element",
            siteId: "site_1",
          },
          width: 901,
          height: 902,
        }),
      ]),
      target: {
        kind: "bare-image",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
        tagged: null,
      },
    });
    expect(output.source).toBe("element");
    expect(output.presetId).toBe("element");
    expect(output.constraints?.width).toBe(901);
    expect(output.constraints?.height).toBe(902);
  });

  it("falls back to site default preset", () => {
    const siteDefault = makeRow({
      id: "site",
      targetKey: {
        kind: "site-default",
        siteId: "site_1",
      },
      width: 1400,
      height: 900,
      exportFormat: "avif",
    });
    const output = resolver.resolve({
      settings: makeSettings([], siteDefault),
      target: {
        kind: "bare-image",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
        tagged: null,
      },
    });
    expect(output.source).toBe("site-default");
    expect(output.presetId).toBe("site");
    expect(output.constraints?.exportFormat).toBe("avif");
  });

  it("falls back to manual when no constraints resolve", () => {
    const output = resolver.resolve({
      settings: makeSettings([]),
      target: {
        kind: "bare-image",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
        tagged: null,
      },
    });
    expect(output).toEqual({
      constraints: null,
      source: "manual",
      presetId: null,
      blockers: [],
    });
  });

  it("returns ambiguous CMS blocker", () => {
    const output = resolver.resolve({
      settings: makeSettings([]),
      target: {
        kind: "cms-ambiguous",
        siteId: "site_1",
      },
    });
    expect(output).toEqual({
      constraints: null,
      source: "manual",
      presetId: null,
      blockers: ["ambiguous-cms-binding"],
    });
  });

  it("duplicate target key assertion detects duplicates", () => {
    const existing = makeRow({
      id: "row_1",
      targetKey: {
        kind: "bare-image-instance",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
      },
    });
    const settings = makeSettings([existing]);
    const result = resolver.assertUniqueTarget(settings, existing.targetKey);
    expect(result).toBe("DUPLICATE_PRESET_TARGET");
  });

  it("excludeId allows update without duplicate error", () => {
    const existing = makeRow({
      id: "row_1",
      targetKey: {
        kind: "component-image",
        siteId: "site_1",
        componentDefinitionId: "comp_1",
        imagePropId: "prop_1",
      },
    });
    const settings = makeSettings([existing]);
    const result = resolver.assertUniqueTarget(settings, existing.targetKey, "row_1");
    expect(result).toBe("ok");
  });

  it("returns deterministic output for the same input", () => {
    const input = {
      settings: makeSettings([
        makeRow({
          id: "component",
          targetKey: {
            kind: "component-image",
            siteId: "site_1",
            componentDefinitionId: "comp_def_1",
            imagePropId: "prop_1",
          },
          width: 777,
          height: 555,
        }),
      ]),
      target: {
        kind: "component-image" as const,
        siteId: "site_1",
        pageId: "page_1",
        instanceElementId: "comp_inst_1",
        componentDefinitionId: "comp_def_1",
        imagePropId: "prop_1",
        tagged: null,
      },
    };
    expect(resolver.resolve(input)).toEqual(resolver.resolve(input));
  });
});

describe("preset target key serialization", () => {
  it("serializes site-default target keys deterministically", () => {
    const a = createSiteDefaultPresetTargetKey("site_1");
    const b = {
      kind: "site-default",
      siteId: "site_1",
    } as const;
    expect(serializePresetTargetKey(a)).toBe(serializePresetTargetKey(b));
  });

  it("is deterministic for equivalent target keys", () => {
    const keyA: PresetTargetKey = {
      kind: "component-image-instance",
      siteId: "site_1",
      pageId: "page_1",
      instanceElementId: "inst_1",
      imagePropId: "prop_1",
    };
    const keyB = {
      imagePropId: "prop_1",
      instanceElementId: "inst_1",
      pageId: "page_1",
      siteId: "site_1",
      kind: "component-image-instance",
    } as PresetTargetKey;
    expect(serializePresetTargetKey(keyA)).toBe(serializePresetTargetKey(keyB));
  });

  it("keeps instance semantics distinct for bare and component images", () => {
    const bareA = serializePresetTargetKey({
      kind: "bare-image-instance",
      siteId: "site_1",
      pageId: "page_1",
      elementId: "img_1",
    });
    const bareB = serializePresetTargetKey({
      kind: "bare-image-instance",
      siteId: "site_1",
      pageId: "page_2",
      elementId: "img_1",
    });
    const component = serializePresetTargetKey({
      kind: "component-image-instance",
      siteId: "site_1",
      pageId: "page_1",
      instanceElementId: "img_1",
      imagePropId: "prop_1",
    });
    expect(bareA).not.toBe(bareB);
    expect(bareA).not.toBe(component);
  });
});

describe("findBeaconPresetRowByTargetKey", () => {
  it("returns site default row for site-default key", () => {
    const siteDefault = makeRow({
      id: "site_row",
      targetKey: createSiteDefaultPresetTargetKey("site_1"),
    });
    const settings = makeSettings([], siteDefault);
    const found = findBeaconPresetRowByTargetKey(settings, createSiteDefaultPresetTargetKey("site_1"));
    expect(found?.id).toBe("site_row");
  });

  it("returns scoped row by canonical target key", () => {
    const row = makeRow({
      id: "instance_row",
      targetKey: {
        kind: "bare-image-instance",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
      },
    });
    const settings = makeSettings([row]);
    const found = findBeaconPresetRowByTargetKey(settings, row.targetKey);
    expect(found?.id).toBe("instance_row");
  });

  it("returns null when no row matches", () => {
    const settings = makeSettings([]);
    const found = findBeaconPresetRowByTargetKey(settings, createSiteDefaultPresetTargetKey("site_1"));
    expect(found).toBeNull();
  });
});

describe("buildPresetTargetKeyForScope", () => {
  it("builds site-default target key from any resolved target", () => {
    const key = buildPresetTargetKeyForScope({
      scope: "site-default",
      target: {
        kind: "component-image",
        siteId: "site_1",
        pageId: "page_1",
        instanceElementId: "inst_1",
        componentDefinitionId: "cmp_1",
        imagePropId: "prop_1",
        tagged: null,
      },
    });
    expect(key).toEqual({ kind: "site-default", siteId: "site_1" });
  });

  it("builds component and instance keys for component-image target", () => {
    expect(
      buildPresetTargetKeyForScope({
        scope: "component",
        target: {
          kind: "component-image",
          siteId: "site_1",
          pageId: "page_1",
          instanceElementId: "inst_1",
          componentDefinitionId: "cmp_1",
          imagePropId: "prop_1",
          tagged: null,
        },
      })
    ).toEqual({
      kind: "component-image",
      siteId: "site_1",
      componentDefinitionId: "cmp_1",
      imagePropId: "prop_1",
    });
    expect(
      buildPresetTargetKeyForScope({
        scope: "instance",
        target: {
          kind: "component-image",
          siteId: "site_1",
          pageId: "page_1",
          instanceElementId: "inst_1",
          componentDefinitionId: "cmp_1",
          imagePropId: "prop_1",
          tagged: null,
        },
      })
    ).toEqual({
      kind: "component-image-instance",
      siteId: "site_1",
      pageId: "page_1",
      instanceElementId: "inst_1",
      imagePropId: "prop_1",
    });
  });

  it("returns null for invalid scope-target combinations", () => {
    expect(
      buildPresetTargetKeyForScope({
        scope: "component",
        target: {
          kind: "bare-image",
          siteId: "site_1",
          pageId: "page_1",
          elementId: "img_1",
          tagged: null,
        },
      })
    ).toBeNull();
  });
});

describe("preset storage listing helpers", () => {
  it("lists site default and scoped rows with scope labels", () => {
    const siteDefault = makeRow({
      id: "site",
      name: "Default",
      targetKey: createSiteDefaultPresetTargetKey("site_1"),
    });
    const instance = makeRow({
      id: "inst",
      targetKey: {
        kind: "bare-image-instance",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
      },
    });
    const entries = listBeaconPresetStorageEntries({
      siteDefault,
      byTargetKey: {
        [serializePresetTargetKey(instance.targetKey)]: instance,
      },
    });
    expect(entries).toHaveLength(2);
    expect(entries.some((entry) => entry.scope === "site-default")).toBe(true);
    expect(entries.some((entry) => entry.scope === "instance")).toBe(true);
    expect(formatBeaconPresetDisplayName(instance, "instance")).toBe(`${instance.name} (Instance)`);
  });
});

describe("instance preset target helpers", () => {
  it("identifies instance preset target keys", () => {
    expect(
      isInstancePresetTargetKey({
        kind: "bare-image-instance",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
      })
    ).toBe(true);
    expect(isInstancePresetTargetKey({ kind: "site-default", siteId: "site_1" })).toBe(false);
  });

  it("matches resolved upload targets to instance preset keys", () => {
    const key: PresetTargetKey = {
      kind: "component-image-instance",
      siteId: "site_1",
      pageId: "page_1",
      instanceElementId: "inst_1",
      imagePropId: "hero-image",
    };
    expect(
      doesResolvedUploadTargetMatchPresetTargetKey(
        {
          kind: "component-image",
          siteId: "site_1",
          pageId: "page_1",
          instanceElementId: "inst_1",
          componentDefinitionId: "cmp_1",
          imagePropId: "hero-image",
          tagged: null,
        },
        key
      )
    ).toBe(true);
  });

  it("formats collection template location labels", () => {
    expect(
      formatBeaconPresetInstanceLocationLabel({
        pageId: "page_1",
        pageName: "Blog post collection",
        pageKind: "cms",
        collectionId: "col_1",
      })
    ).toBe("Blog Post Template");
    expect(
      formatBeaconPresetInstanceLocationLabel({
        pageId: "page_1",
        pageName: "Blog Posts Collection Template",
        pageKind: "cms",
        collectionId: "col_1",
      })
    ).toBe("Blog Posts Template");
    expect(
      formatBeaconPresetInstanceLocationLabel({
        pageId: "page_1",
        pageName: "Collection template · Blog posts",
        pageKind: "cms",
        collectionId: "col_1",
      })
    ).toBe("Blog Posts Template");
    expect(
      formatBeaconPresetInstanceLocationLabel({
        pageId: "page_1",
        pageName: "Blog Posts Collection Template",
        pageKind: "static",
      })
    ).toBe("Blog Posts Template");
  });
});

describe("multi-site preset storage helpers", () => {
  it("coalesces legacy siteDefault into byTargetKey", () => {
    const siteDefault = makeRow({
      id: "site_1_default",
      targetKey: createSiteDefaultPresetTargetKey("site_1"),
    });
    const coalesced = coalesceBeaconPresetStorage({
      siteDefault,
      byTargetKey: {},
    });
    expect(coalesced.siteDefault).toEqual(siteDefault);
    expect(coalesced.byTargetKey[serializePresetTargetKey(createSiteDefaultPresetTargetKey("site_1"))]?.id).toBe(
      "site_1_default"
    );
  });

  it("clears legacy siteDefault mirror when multiple site defaults exist", () => {
    const siteOne = makeRow({
      id: "site_1_default",
      targetKey: createSiteDefaultPresetTargetKey("site_1"),
    });
    const siteTwo = makeRow({
      id: "site_2_default",
      targetKey: createSiteDefaultPresetTargetKey("site_2"),
    });
    const coalesced = coalesceBeaconPresetStorage({
      siteDefault: siteOne,
      byTargetKey: {
        [serializePresetTargetKey(siteTwo.targetKey)]: siteTwo,
      },
    });
    expect(coalesced.siteDefault).toBeNull();
    expect(resolveSiteDefaultPresetRow(coalesced, "site_1")?.id).toBe("site_1_default");
    expect(resolveSiteDefaultPresetRow(coalesced, "site_2")?.id).toBe("site_2_default");
  });

  it("applies site-default patches without overwriting other sites", () => {
    const siteOne = makeRow({
      id: "site_1_default",
      targetKey: createSiteDefaultPresetTargetKey("site_1"),
    });
    const siteTwo = makeRow({
      id: "site_2_default",
      targetKey: createSiteDefaultPresetTargetKey("site_2"),
    });
    const base = coalesceBeaconPresetStorage({
      siteDefault: siteOne,
      byTargetKey: {
        [serializePresetTargetKey(siteTwo.targetKey)]: siteTwo,
      },
    });
    const updatedSiteTwo = {
      ...siteTwo,
      width: 1600,
      height: 900,
    };
    const next = applySiteDefaultPresetPatch(base, "site_2", updatedSiteTwo);
    expect(resolveSiteDefaultPresetRow(next, "site_1")?.id).toBe("site_1_default");
    expect(resolveSiteDefaultPresetRow(next, "site_2")?.width).toBe(1600);
  });

  it("upserts and removes scoped presets by id", () => {
    const instance = makeRow({
      id: "inst",
      name: "Hero",
      targetKey: {
        kind: "bare-image-instance",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
      },
    });
    const base = coalesceBeaconPresetStorage({ siteDefault: null, byTargetKey: {} });
    const withRow = applyBeaconPresetRowUpsert(base, instance);
    expect(withRow.byTargetKey[serializePresetTargetKey(instance.targetKey)]?.name).toBe("Hero");

    const updated = { ...instance, name: "Hero updated", width: 800, height: 600 };
    const next = applyBeaconPresetRowUpsert(withRow, updated);
    expect(next.byTargetKey[serializePresetTargetKey(instance.targetKey)]?.name).toBe("Hero updated");

    const cleared = removeBeaconPresetRowById(next, "inst");
    expect(Object.keys(cleared.byTargetKey)).toHaveLength(0);
  });

  it("groups presets by site id and includes catalog-only sites", () => {
    const siteDefault = makeRow({
      id: "site_1_default",
      targetKey: createSiteDefaultPresetTargetKey("site_1"),
    });
    const instance = makeRow({
      id: "inst",
      targetKey: {
        kind: "bare-image-instance",
        siteId: "site_1",
        pageId: "page_1",
        elementId: "img_1",
      },
    });
    const groups = buildBeaconPresetSiteGroups(
      {
        siteDefault,
        byTargetKey: {
          [serializePresetTargetKey(instance.targetKey)]: instance,
        },
      },
      [
        { id: "site_1", displayName: "Marketing", shortName: "marketing-site" },
        { id: "site_2", displayName: "Docs", shortName: "docs-site" },
      ]
    );
    expect(groups).toHaveLength(2);
    expect(groups[0]?.displayName).toBe("Docs");
    expect(groups[0]?.siteId).toBe("site_2");
    expect(groups[0]?.shortName).toBe("docs-site");
    expect(groups[0]?.scopedPresets).toHaveLength(0);
    expect(groups[1]?.displayName).toBe("Marketing");
    expect(groups[1]?.shortName).toBe("marketing-site");
    expect(groups[1]?.siteDefault?.id).toBe("site_1_default");
    expect(groups[1]?.scopedPresets).toHaveLength(1);
  });
});

describe("resolveRemovableComponentExportProps", () => {
  function entryFor(targetKey: PresetTargetKey, id: string): BeaconPresetStorageEntry {
    const row = makeRow({ id, targetKey });
    return { row, scope: inferPresetCrudScopeFromTargetKey(row) };
  }

  const componentKey = (componentDefinitionId: string, imagePropId: string): PresetTargetKey => ({
    kind: "component-image",
    siteId: "site_1",
    componentDefinitionId,
    imagePropId,
  });

  it("removes props when the deleted component preset was the last reference to the definition", () => {
    const deleted = entryFor(componentKey("cmp_1", "hero-image"), "preset_1");
    expect(resolveRemovableComponentExportProps({ deleted, remaining: [] })).toEqual({
      componentDefinitionId: "cmp_1",
    });
  });

  it("ignores remaining presets for a different component definition", () => {
    const deleted = entryFor(componentKey("cmp_1", "hero-image"), "preset_1");
    const other = entryFor(componentKey("cmp_2", "hero-image"), "preset_2");
    expect(resolveRemovableComponentExportProps({ deleted, remaining: [other] })).toEqual({
      componentDefinitionId: "cmp_1",
    });
  });

  it("keeps props when a sibling component preset shares the definition (any image field)", () => {
    const deleted = entryFor(componentKey("cmp_1", "hero-image"), "preset_1");
    const sibling = entryFor(componentKey("cmp_1", "logo-image"), "preset_2");
    expect(resolveRemovableComponentExportProps({ deleted, remaining: [sibling] })).toBeNull();
  });

  it("keeps props when any component-instance preset remains (cannot map to a definition offline)", () => {
    const deleted = entryFor(componentKey("cmp_1", "hero-image"), "preset_1");
    const instance = entryFor(
      {
        kind: "component-image-instance",
        siteId: "site_1",
        pageId: "page_9",
        instanceElementId: "inst_9",
        imagePropId: "card-image",
      },
      "preset_2"
    );
    expect(resolveRemovableComponentExportProps({ deleted, remaining: [instance] })).toBeNull();
  });

  it("returns null for non-component deletions (instance/site-default/bare)", () => {
    const instance = entryFor(
      { kind: "bare-image-instance", siteId: "site_1", pageId: "page_1", elementId: "img_1" },
      "preset_1"
    );
    expect(resolveRemovableComponentExportProps({ deleted: instance, remaining: [] })).toBeNull();

    const siteDefault = entryFor({ kind: "site-default", siteId: "site_1" }, "preset_2");
    expect(resolveRemovableComponentExportProps({ deleted: siteDefault, remaining: [] })).toBeNull();
  });
});
