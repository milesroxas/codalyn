import { beforeEach, describe, expect, it, vi } from "vitest";
import { WEBFLOW_IMAGE_ELEMENT_TYPE } from "@/features/image-editor/lib/apply-cropped-export";
import {
  findImageElementForComponentInstanceProp,
  imageElementBindsToComponentProp,
  imageElementMatchesComponentImageProp,
} from "@/features/image-editor/lib/find-image-element-for-component-instance-prop";
import type { ComponentInstanceImageProp } from "@/features/image-editor/lib/search-component-instance-image-props";

const { searchPropsMock } = vi.hoisted(() => ({
  searchPropsMock: vi.fn(),
}));

vi.mock("@/features/image-editor/lib/search-component-instance-image-props", () => ({
  searchComponentInstanceImageProps: (...args: unknown[]) => searchPropsMock(...args),
}));

function imageEl(id: string, searchSettings: ImageElement["searchSettings"]): ImageElement {
  return {
    type: WEBFLOW_IMAGE_ELEMENT_TYPE,
    id: { component: "cmp", element: id },
    searchSettings,
  } as unknown as ImageElement;
}

function instanceEl(overrides: Partial<ComponentElement> = {}): ComponentElement {
  return {
    type: "ComponentInstance",
    id: { component: "cmp", element: "inst" },
    getChildren: vi.fn().mockResolvedValue([]),
    getSlots: vi.fn().mockResolvedValue([]),
    getProps: vi.fn().mockResolvedValue([]),
    getComponent: vi.fn(),
    ...overrides,
  } as unknown as ComponentElement;
}

describe("imageElementBindsToComponentProp", () => {
  it("matches prop bindings on image settings", async () => {
    const img = imageEl(
      "img-1",
      vi.fn().mockResolvedValue({
        main: {
          valueType: "image",
          value: { sourceType: "prop", propId: "hero-image" },
        },
      })
    );
    await expect(imageElementBindsToComponentProp(img, "hero-image")).resolves.toBe(true);
    await expect(imageElementBindsToComponentProp(img, "other")).resolves.toBe(false);
  });

  it("matches alternate wrapped prop binding shapes", async () => {
    const img = imageEl(
      "img-1",
      vi.fn().mockResolvedValue({
        main: {
          valueType: "image",
          sourceType: "prop",
          propId: "hero-image",
        },
      })
    );
    await expect(imageElementBindsToComponentProp(img, "hero-image")).resolves.toBe(true);
  });

  it("matches CMS instance props when the image binds to the component prop id", async () => {
    const img = imageEl(
      "img-1",
      vi.fn().mockResolvedValue({
        main: {
          valueType: "image",
          value: { sourceType: "prop", propId: "hero-image" },
        },
      })
    );
    const instance = instanceEl();
    const matched = await imageElementMatchesComponentImageProp(instance, img, "hero-image", [
      {
        propId: "hero-image",
        value: {
          sourceType: "cms",
          collectionId: "collection-1",
          fieldId: "field-1",
        },
        isCmsBinding: true,
      } as unknown as ComponentInstanceImageProp,
    ]);
    expect(matched).toBe(true);
  });
});

describe("findImageElementForComponentInstanceProp", () => {
  beforeEach(() => {
    searchPropsMock.mockReset();
    vi.stubGlobal("webflow", {
      getAllElements: vi.fn().mockResolvedValue([]),
      enterComponent: vi.fn().mockResolvedValue(undefined),
      exitComponent: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("finds the image from the component definition root after enterComponent", async () => {
    const boundImage = imageEl(
      "def-img",
      vi.fn().mockResolvedValue({
        main: {
          valueType: "image",
          value: { sourceType: "prop", propId: "hero-image" },
        },
      })
    );
    const wrapper = {
      type: "Block",
      id: { component: "cmp", element: "wrap" },
      getChildren: vi.fn().mockResolvedValue([boundImage]),
    } as unknown as AnyElement;
    const instance = instanceEl();

    searchPropsMock.mockResolvedValue([
      {
        propId: "hero-image",
        value: { sourceType: "prop", propId: "hero-image" },
        isCmsBinding: false,
      },
    ]);

    const found = await findImageElementForComponentInstanceProp(instance, "hero-image", {
      definitionRoot: wrapper,
    });
    expect(found).toBe(boundImage);
  });

  it("finds an image nested inside a div wrapper in the component definition", async () => {
    const boundImage = imageEl(
      "def-img",
      vi.fn().mockResolvedValue({
        main: {
          valueType: "image",
          value: { sourceType: "prop", propId: "hero-image" },
        },
      })
    );
    const div = {
      type: "Block",
      id: { component: "cmp", element: "div" },
      getChildren: vi.fn().mockResolvedValue([boundImage]),
    } as unknown as AnyElement;
    const root = {
      type: "Block",
      id: { component: "cmp", element: "root" },
      getChildren: vi.fn().mockResolvedValue([div]),
    } as unknown as AnyElement;
    const instance = instanceEl();

    searchPropsMock.mockResolvedValue([
      {
        propId: "hero-image",
        value: { sourceType: "prop", propId: "hero-image" },
        isCmsBinding: false,
      },
    ]);

    const found = await findImageElementForComponentInstanceProp(instance, "hero-image", {
      definitionRoot: root,
    });
    expect(found).toBe(boundImage);
  });

  it("finds an image inside a linked nested component definition", async () => {
    const nestedImage = imageEl(
      "nested-img",
      vi.fn().mockResolvedValue({
        main: {
          valueType: "image",
          value: { sourceType: "prop", propId: "card-img" },
        },
      })
    );
    const nestedRoot = {
      type: "Block",
      id: { component: "nested-cmp", element: "nested-root" },
      getChildren: vi.fn().mockResolvedValue([nestedImage]),
    } as unknown as AnyElement;
    const nestedComponent = {
      getRootElement: vi.fn().mockResolvedValue(nestedRoot),
    } as unknown as Component;
    const nestedInstance = instanceEl({
      id: { component: "cmp", element: "nested-inst" },
      getProps: vi
        .fn()
        .mockResolvedValue([{ propId: "card-img", value: { sourceType: "prop", propId: "hero-image" } }]),
      getComponent: vi.fn().mockResolvedValue(nestedComponent),
    });
    const root = {
      type: "Block",
      id: { component: "cmp", element: "root" },
      getChildren: vi.fn().mockResolvedValue([nestedInstance]),
    } as unknown as AnyElement;
    const instance = instanceEl();

    searchPropsMock.mockResolvedValue([
      {
        propId: "hero-image",
        value: { sourceType: "prop", propId: "hero-image" },
        isCmsBinding: false,
      },
    ]);

    const found = await findImageElementForComponentInstanceProp(instance, "hero-image", {
      definitionRoot: root,
    });
    expect(found).toBe(nestedImage);
    expect(webflow.enterComponent).toHaveBeenCalledWith(nestedInstance);
    expect(webflow.exitComponent).toHaveBeenCalled();
  });

  it("falls back to the only image under the definition root for single-image components", async () => {
    const loneImage = imageEl("def-img", vi.fn().mockResolvedValue({}));
    const root = {
      type: "Block",
      id: { component: "cmp", element: "root" },
      getChildren: vi.fn().mockResolvedValue([loneImage]),
    } as unknown as AnyElement;
    const instance = instanceEl();

    searchPropsMock.mockResolvedValue([
      {
        propId: "hero-image",
        value: null,
        isCmsBinding: false,
      },
    ]);

    const found = await findImageElementForComponentInstanceProp(instance, "hero-image", {
      definitionRoot: root,
    });
    expect(found).toBe(loneImage);
  });

  it("reuses preloaded instance image props during tree walks", async () => {
    const loneImage = imageEl("def-img", vi.fn().mockResolvedValue({}));
    const root = {
      type: "Block",
      id: { component: "cmp", element: "root" },
      getChildren: vi.fn().mockResolvedValue([loneImage]),
    } as unknown as AnyElement;
    const instance = instanceEl();

    const found = await findImageElementForComponentInstanceProp(instance, "hero-image", {
      definitionRoot: root,
      instanceImageProps: [
        {
          propId: "hero-image",
          value: "",
          isCmsBinding: false,
        } as unknown as ComponentInstanceImageProp,
      ],
    });
    expect(found).toBe(loneImage);
    expect(searchPropsMock).not.toHaveBeenCalled();
  });
});
