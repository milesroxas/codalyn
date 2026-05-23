import type { PresetTargetKey } from "@codalyn/webflow-kit";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  findImagePageTargetForPresetOnCurrentPage,
  getPresetLocateAction,
  locatePresetTarget,
} from "./locate-preset-target";

const WEBFLOW_IMAGE_ELEMENT_TYPE = "Image";

function installWebflow(overrides: Record<string, unknown>) {
  Object.assign(globalThis, {
    webflow: overrides,
  });
}

describe("getPresetLocateAction", () => {
  it("returns open-component for component-scoped keys", () => {
    const action = getPresetLocateAction({
      kind: "component-image",
      siteId: "site_1",
      componentDefinitionId: "cmp_1",
      imagePropId: "hero-image",
    });
    expect(action.kind).toBe("open-component");
  });

  it("returns find-on-canvas for instance-scoped keys", () => {
    const action = getPresetLocateAction({
      kind: "bare-image-instance",
      siteId: "site_1",
      pageId: "page_1",
      elementId: "img_1",
    });
    expect(action.kind).toBe("find-on-canvas");
  });

  it("returns none for site-wide keys", () => {
    const action = getPresetLocateAction({ kind: "site-default", siteId: "site_1" });
    expect(action.kind).toBe("none");
  });
});

describe("findImagePageTargetForPresetOnCurrentPage", () => {
  beforeEach(() => {
    installWebflow({
      getAllElements: vi.fn().mockResolvedValue([]),
    });
  });

  it("finds a bare image instance target by element id", async () => {
    const image = {
      type: WEBFLOW_IMAGE_ELEMENT_TYPE,
      id: { component: "page_1", element: "img_1" },
    };
    installWebflow({
      getAllElements: vi.fn().mockResolvedValue([image]),
    });

    const target = await findImagePageTargetForPresetOnCurrentPage({
      kind: "bare-image-instance",
      siteId: "site_1",
      pageId: "page_1",
      elementId: "img_1",
    });

    expect(target?.kind).toBe("image");
    expect(target?.element).toBe(image);
  });

  it("finds a component instance target when the image prop exists", async () => {
    const instance = {
      type: "ComponentInstance",
      id: { component: "page_1", element: "inst_1" },
      getComponent: vi.fn().mockResolvedValue({ getName: vi.fn().mockResolvedValue("Hero") }),
      searchProps: vi.fn().mockImplementation(({ valueType }: { valueType: string }) => {
        if (valueType === "imageAsset") {
          return Promise.resolve([
            {
              propId: "hero-image",
              value: null,
              display: { label: "Hero image" },
            },
          ]);
        }
        return Promise.resolve([]);
      }),
      getChildren: vi.fn().mockResolvedValue([]),
      getSlots: vi.fn().mockResolvedValue([]),
    };
    installWebflow({
      getAllElements: vi.fn().mockResolvedValue([instance]),
    });

    const target = await findImagePageTargetForPresetOnCurrentPage({
      kind: "component-image-instance",
      siteId: "site_1",
      pageId: "page_1",
      instanceElementId: "inst_1",
      imagePropId: "hero-image",
    });

    expect(target?.kind).toBe("component");
    expect(target?.imagePropId).toBe("hero-image");
    expect(target?.element).toBe(instance);
  });
});

describe("locatePresetTarget", () => {
  it("opens the component definition canvas for component presets", async () => {
    const component = { id: "cmp_1" };
    const openCanvas = vi.fn().mockResolvedValue(undefined);
    installWebflow({
      getCurrentPage: vi.fn().mockResolvedValue({ id: "page_1" }),
      getCurrentComponent: vi.fn().mockResolvedValue(null),
      exitComponent: vi.fn().mockResolvedValue(undefined),
      getComponent: vi.fn().mockResolvedValue(component),
      openCanvas,
    });

    const result = await locatePresetTarget({
      siteId: "site_1",
      targetKey: {
        kind: "component-image",
        siteId: "site_1",
        componentDefinitionId: "cmp_1",
        imagePropId: "hero-image",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.navigatedToComponent).toBe(true);
      expect(result.target).toBeNull();
    }
    expect(openCanvas).toHaveBeenCalledWith(component);
  });

  it("rejects presets from another site", async () => {
    const result = await locatePresetTarget({
      siteId: "site_1",
      targetKey: {
        kind: "bare-image-instance",
        siteId: "site_2",
        pageId: "page_1",
        elementId: "img_1",
      } satisfies PresetTargetKey,
    });

    expect(result).toEqual({ ok: false, error: "This preset belongs to a different site." });
  });
});
