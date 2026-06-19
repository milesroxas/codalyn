import { beforeEach, describe, expect, it, vi } from "vitest";
import { WEBFLOW_IMAGE_ELEMENT_TYPE } from "@/features/image-editor/lib/apply-cropped-export";
import {
  BEACON_EXPORT_HEIGHT_ATTR,
  BEACON_EXPORT_WIDTH_ATTR,
} from "@/features/image-editor/lib/beacon-designer-image-export-attrs";
import {
  BEACON_EXPORT_WIDTH_PROP_NAME,
  ensureBeaconExportDimensionPropsOnDefinition,
  removeBeaconExportDimensionPropsOnDefinition,
} from "@/features/image-editor/lib/ensure-beacon-export-dimension-props";
import type { ComponentInstanceImageProp } from "@/features/image-editor/lib/search-component-instance-image-props";

type BoundSetting = { valueType: string; value: { sourceType: "prop"; propId: string } };

function imageEl(boundPropId: string | null): ImageElement {
  const settings =
    boundPropId == null
      ? {}
      : { main: { valueType: "image", value: { sourceType: "prop", propId: boundPropId } } as BoundSetting };
  return {
    type: WEBFLOW_IMAGE_ELEMENT_TYPE,
    id: { component: "cmp", element: `img-${boundPropId ?? "none"}` },
    customAttributes: true,
    searchSettings: vi.fn().mockResolvedValue(settings),
    getAllCustomAttributes: vi.fn().mockResolvedValue([]),
    setSettings: vi.fn().mockResolvedValue(undefined),
    removeCustomAttribute: vi.fn().mockResolvedValue(null),
  } as unknown as ImageElement;
}

function blockEl(id: string, children: AnyElement[]): AnyElement {
  return {
    type: "Block",
    id: { component: "cmp", element: id },
    getChildren: vi.fn().mockResolvedValue(children),
  } as unknown as AnyElement;
}

/** Stateful component definition: `getProps` returns props created via `createProps`. */
function definitionMock(idPrefix: string, root: AnyElement) {
  let props: Array<{ id: string; type: string; name: string }> = [];
  const def = {
    getRootElement: vi.fn().mockResolvedValue(root),
    getProps: vi.fn(async () => props),
    createProps: vi.fn(async (toCreate: Array<{ name: string }>) => {
      const created = toCreate.map((o) => ({
        id: o.name === BEACON_EXPORT_WIDTH_PROP_NAME ? `${idPrefix}-w` : `${idPrefix}-h`,
        type: "string",
        name: o.name,
      }));
      props = [...props, ...created];
      return created;
    }),
    setProp: vi.fn().mockResolvedValue(undefined),
    removeProp: vi.fn().mockResolvedValue(null),
  };
  return def as unknown as Component & typeof def;
}

function instanceEl(overrides: Partial<ComponentElement> = {}): ComponentElement {
  return {
    type: "ComponentInstance",
    id: { component: "cmp", element: "inst" },
    getChildren: vi.fn().mockResolvedValue([]),
    getSlots: vi.fn().mockResolvedValue([]),
    getProps: vi.fn().mockResolvedValue([]),
    getComponent: vi.fn(),
    setProps: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ComponentElement;
}

const heroImageProp: ComponentInstanceImageProp = {
  propId: "hero-image",
  value: "",
  isCmsBinding: false,
} as unknown as ComponentInstanceImageProp;

describe("ensureBeaconExportDimensionPropsOnDefinition", () => {
  beforeEach(() => {
    vi.stubGlobal("webflow", {
      appModes: { canModifyComponents: "canModifyComponents" },
      canForAppMode: vi.fn().mockResolvedValue({ canModifyComponents: true }),
      enterComponent: vi.fn().mockResolvedValue(undefined),
      exitComponent: vi.fn().mockResolvedValue(undefined),
      getCurrentComponent: vi.fn(),
    });
  });

  it("binds the image to the entered definition's own props when the image is not nested", async () => {
    const img = imageEl("hero-image");
    const root = blockEl("root", [img]);
    const def = definitionMock("d0", root);
    const instance = instanceEl();

    const result = await ensureBeaconExportDimensionPropsOnDefinition(def, instance, "hero-image", root, [
      heroImageProp,
    ]);

    expect(result).toEqual({ widthPropId: "d0-w", heightPropId: "d0-h" });
    expect(def.createProps).toHaveBeenCalledTimes(1);
    expect(img.setSettings).toHaveBeenCalledTimes(1);
    expect(instance.setProps).not.toHaveBeenCalled();
    expect(webflow.enterComponent).not.toHaveBeenCalled();
  });

  it("creates props on the nested definition and chains them up so the binding source is valid", async () => {
    const nestedImage = imageEl("card-image");
    const nestedRoot = blockEl("nested-root", [nestedImage]);
    const nestedDef = definitionMock("d1", nestedRoot);

    const nestedInstance = instanceEl({
      id: { component: "cmp", element: "nested-inst" },
      getProps: vi
        .fn()
        .mockResolvedValue([{ propId: "card-image", value: { sourceType: "prop", propId: "hero-image" } }]),
      getComponent: vi.fn().mockResolvedValue(nestedDef),
    });
    const root = blockEl("root", [nestedInstance]);
    const topDef = definitionMock("d0", root);
    const pageInstance = instanceEl();

    vi.mocked(webflow.enterComponent).mockImplementation(async (inst) => {
      vi.mocked(webflow.getCurrentComponent).mockResolvedValue(await (inst as ComponentElement).getComponent());
      return null;
    });

    const result = await ensureBeaconExportDimensionPropsOnDefinition(topDef, pageInstance, "hero-image", root, [
      heroImageProp,
    ]);

    // Caller-facing ids belong to the top-level definition.
    expect(result).toEqual({ widthPropId: "d0-w", heightPropId: "d0-h" });

    // Props were created on BOTH definitions.
    expect(nestedDef.createProps).toHaveBeenCalledTimes(1);
    expect(topDef.createProps).toHaveBeenCalledTimes(1);

    // The image binds to the NESTED definition's props (its own scope).
    const setSettingsArg = vi.mocked(nestedImage.setSettings).mock.calls[0]?.[0] as {
      attributes: Array<{ name: string; value: { sourceType: string; propId: string } }>;
    };
    const boundPropIds = setSettingsArg.attributes.map((a) => a.value.propId);
    expect(boundPropIds).toEqual(expect.arrayContaining(["d1-w", "d1-h"]));

    // The nested instance's props are fed from the top-level definition's props.
    expect(nestedInstance.setProps).toHaveBeenCalledWith([
      { propId: "d1-w", value: { sourceType: "prop", propId: "d0-w" } },
      { propId: "d1-h", value: { sourceType: "prop", propId: "d0-h" } },
    ]);

    expect(webflow.enterComponent).toHaveBeenCalledWith(nestedInstance);
    expect(webflow.exitComponent).toHaveBeenCalled();
  });

  it("falls back to the only image for single-image components with no prop binding", async () => {
    const img = imageEl(null);
    const root = blockEl("root", [img]);
    const def = definitionMock("d0", root);
    const instance = instanceEl();

    const result = await ensureBeaconExportDimensionPropsOnDefinition(def, instance, "hero-image", root, [
      heroImageProp,
    ]);

    expect(result).toEqual({ widthPropId: "d0-w", heightPropId: "d0-h" });
    expect(img.setSettings).toHaveBeenCalledTimes(1);
  });

  it("throws when no matching image is found", async () => {
    const root = blockEl("root", []);
    const def = definitionMock("d0", root);
    const instance = instanceEl();

    await expect(
      ensureBeaconExportDimensionPropsOnDefinition(def, instance, "hero-image", root, [heroImageProp])
    ).rejects.toThrow(/Could not find the image field/);
  });
});

describe("removeBeaconExportDimensionPropsOnDefinition", () => {
  beforeEach(() => {
    vi.stubGlobal("webflow", {
      appModes: { canModifyComponents: "canModifyComponents" },
      canForAppMode: vi.fn().mockResolvedValue({ canModifyComponents: true }),
    });
  });

  it("removes the export props and unbinds the image custom attributes", async () => {
    const img = imageEl("hero-image");
    const root = blockEl("root", [img]);
    const def = definitionMock("d0", root);
    const instance = instanceEl();

    // Seed props + bindings as a save would, then tear them down.
    const ids = await ensureBeaconExportDimensionPropsOnDefinition(def, instance, "hero-image", root, [heroImageProp]);

    const removed = await removeBeaconExportDimensionPropsOnDefinition(def, root);

    expect(removed).toBe(true);
    expect(img.removeCustomAttribute).toHaveBeenCalledWith(BEACON_EXPORT_WIDTH_ATTR);
    expect(img.removeCustomAttribute).toHaveBeenCalledWith(BEACON_EXPORT_HEIGHT_ATTR);
    expect(def.removeProp).toHaveBeenCalledWith(ids.widthPropId);
    expect(def.removeProp).toHaveBeenCalledWith(ids.heightPropId);
  });

  it("returns false and touches nothing when the definition has no export props", async () => {
    const img = imageEl("hero-image");
    const root = blockEl("root", [img]);
    const def = definitionMock("d0", root);

    const removed = await removeBeaconExportDimensionPropsOnDefinition(def, root);

    expect(removed).toBe(false);
    expect(def.removeProp).not.toHaveBeenCalled();
    expect(img.removeCustomAttribute).not.toHaveBeenCalled();
  });
});
