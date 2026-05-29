import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CMS_SLOT_BEACON_BIND_ATTR,
  CMS_SLOT_BEACON_PROP_ATTR,
} from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import { stripEngineCodalynAttrsFromComponentInstance } from "@/features/cms-slots/model/cms-slot-engine-codalyn-attr-sync";

function domWithCodalynAttrs(attrs: Record<string, string>, children: AnyElement[] = []): AnyElement {
  const store = new Map(Object.entries(attrs));
  return {
    type: "DOM",
    children: true,
    getAttribute: vi.fn(async (name: string) => store.get(name) ?? null),
    removeAttribute: vi.fn(async (name: string) => {
      store.delete(name);
      return null;
    }),
    getChildren: vi.fn(async () => children),
  } as unknown as AnyElement;
}

describe("stripEngineCodalynAttrsFromComponentInstance", () => {
  const exitComponent = vi.fn().mockResolvedValue(undefined);
  const enterComponent = vi.fn().mockResolvedValue(undefined);
  const getCurrentComponent = vi.fn();
  const getRootElement = vi.fn();

  beforeEach(() => {
    exitComponent.mockClear();
    enterComponent.mockClear();
    getCurrentComponent.mockReset();
    getRootElement.mockReset();
    vi.stubGlobal("webflow", {
      exitComponent,
      enterComponent,
      getCurrentComponent,
      getCurrentPage: vi.fn().mockResolvedValue({ id: "page_1" }),
      openCanvas: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("removes codalyn attrs from the definition tree and nested component definitions", async () => {
    const nestedRoot = domWithCodalynAttrs({
      [CMS_SLOT_BEACON_PROP_ATTR]: "nested-title",
      [CMS_SLOT_BEACON_BIND_ATTR]: "cmp-nested|title",
    });
    const nestedInstance = {
      type: "ComponentInstance",
      getSlots: vi.fn(async () => []),
      getComponent: vi.fn(async () => ({
        getRootElement: vi.fn(async () => nestedRoot),
      })),
    } as unknown as ComponentElement;

    const root = domWithCodalynAttrs(
      {
        [CMS_SLOT_BEACON_PROP_ATTR]: "hero-title",
        [CMS_SLOT_BEACON_BIND_ATTR]: "cmp-root|hero",
      },
      [nestedInstance]
    );

    const instance = { type: "ComponentInstance" } as ComponentElement;
    const definition = { getRootElement };
    getCurrentComponent.mockResolvedValueOnce(null).mockResolvedValue(definition);
    getRootElement.mockResolvedValue(root);

    const result = await stripEngineCodalynAttrsFromComponentInstance(instance);

    expect(result.removed).toBe(4);
    expect(result.errors).toEqual([]);
    expect(enterComponent).toHaveBeenCalledWith(instance);
    expect(enterComponent).toHaveBeenCalledWith(nestedInstance);
    const rootDom = root as unknown as {
      removeAttribute: ReturnType<typeof vi.fn>;
    };
    const nestedRootDom = nestedRoot as unknown as {
      removeAttribute: ReturnType<typeof vi.fn>;
    };
    expect(rootDom.removeAttribute).toHaveBeenCalledWith(CMS_SLOT_BEACON_PROP_ATTR);
    expect(rootDom.removeAttribute).toHaveBeenCalledWith(CMS_SLOT_BEACON_BIND_ATTR);
    expect(nestedRootDom.removeAttribute).toHaveBeenCalledWith(CMS_SLOT_BEACON_PROP_ATTR);
    expect(nestedRootDom.removeAttribute).toHaveBeenCalledWith(CMS_SLOT_BEACON_BIND_ATTR);
  });

  it("returns a non-fatal error when the component definition cannot be opened", async () => {
    enterComponent.mockRejectedValueOnce(new Error("forbidden"));
    getCurrentComponent.mockResolvedValue(null);

    const result = await stripEngineCodalynAttrsFromComponentInstance({
      type: "ComponentInstance",
    } as ComponentElement);

    expect(result.removed).toBe(0);
    expect(result.errors).toEqual(["Could not open this component for attribute cleanup."]);
    expect(exitComponent).not.toHaveBeenCalled();
  });
});
