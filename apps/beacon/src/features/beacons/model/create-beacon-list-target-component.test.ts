import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/beacons/model/beacon-list-target-slot-style", () => ({
  ensureBeaconListTargetSlotStyle: vi.fn().mockResolvedValue({ id: "mock-slot" }),
}));

import {
  BEACON_LIST_RENDER_TAG,
  BEACON_UTILITIES_COMPONENT_GROUP,
  getBeaconListTargetComponentOrNull,
  uniqueBeaconListTargetComponentName,
} from "./create-beacon-list-target-component";

const DATA_LIST = "beacon-cms-list-test";

let webflowPrev: unknown;

function installWebflow(overrides: {
  getComponent: ReturnType<typeof vi.fn>;
  getComponentByName: ReturnType<typeof vi.fn>;
  searchComponents: ReturnType<typeof vi.fn>;
}): void {
  (globalThis as unknown as { webflow: WebflowApi }).webflow = {
    getComponent: overrides.getComponent,
    getComponentByName: overrides.getComponentByName,
    searchComponents: overrides.searchComponents,
  } as unknown as WebflowApi;
}

/**
 * In-memory `data-*` on the list-target root; `applyBeaconListTargetSync` updates these to match
 * a current {@link listContainer} when ids are stale.
 */
function makeListTargetDomRoot(initial: Record<string, string>): {
  getTag: ReturnType<typeof vi.fn>;
  setTag: ReturnType<typeof vi.fn>;
  getAttribute: ReturnType<typeof vi.fn>;
  setAttribute: ReturnType<typeof vi.fn>;
  setStyles: ReturnType<typeof vi.fn>;
} {
  const attrs: Record<string, string> = { ...initial };
  return {
    getTag: vi.fn().mockImplementation(async () => BEACON_LIST_RENDER_TAG),
    setTag: vi.fn().mockResolvedValue(undefined),
    getAttribute: vi.fn().mockImplementation(async (k: string) => (k in attrs ? attrs[k] : null)),
    setAttribute: vi.fn().mockImplementation(async (k: string, v: string) => {
      attrs[k] = v;
    }),
    setStyles: vi.fn().mockResolvedValue(undefined),
  };
}

function makeListContainer(overrides?: Partial<Pick<BlockElement, "id">>): BlockElement {
  return {
    id: {
      element: "new-list-element-99",
      component: "new-list-component-88",
    },
    ...(overrides ?? {}),
  } as BlockElement;
}

describe("getBeaconListTargetComponentOrNull", () => {
  beforeEach(() => {
    webflowPrev = (globalThis as { webflow?: unknown }).webflow;
  });

  afterEach(() => {
    (globalThis as { webflow?: unknown }).webflow = webflowPrev;
  });

  it("returns immediately on preferredDefinitionId when the definition root already matches the list (no resync)", async () => {
    const listContainer = makeListContainer();
    const desiredName = uniqueBeaconListTargetComponentName(DATA_LIST, listContainer);
    const dom = makeListTargetDomRoot({
      "data-target": "beacons",
      "data-list": DATA_LIST,
      "data-beacon-list-element-id": listContainer.id.element,
      "data-beacon-list-component-id": listContainer.id.component,
      "data-beacon-target": "list",
    });
    const def = {
      id: "def-123",
      getName: vi.fn().mockResolvedValue(desiredName),
      getRootElement: vi.fn().mockResolvedValue({ type: "DOM" as const, ...dom }),
    } as unknown as Component;

    const getComponent = vi.fn().mockResolvedValue(def);
    const getComponentByName = vi.fn();
    const searchComponents = vi.fn();
    installWebflow({ getComponent, getComponentByName, searchComponents });

    const out = await getBeaconListTargetComponentOrNull(DATA_LIST, listContainer, "def-123");
    expect(out).toBe(def);
    expect(getComponent).toHaveBeenCalledWith("def-123");
    expect(getComponentByName).not.toHaveBeenCalled();
    expect(searchComponents).not.toHaveBeenCalled();
    expect(dom.setAttribute).not.toHaveBeenCalled();
  });

  it("when preferred id resolves but per-list data-* ids are stale, resyncs the definition and returns it (name lookup would miss)", async () => {
    const listContainer = makeListContainer();
    const dom = makeListTargetDomRoot({
      "data-target": "beacons",
      "data-list": DATA_LIST,
      "data-beacon-list-element-id": "stale-element",
      "data-beacon-list-component-id": "stale-component",
      "data-beacon-target": "list",
    });
    const setName = vi.fn().mockResolvedValue(undefined);
    const def = {
      id: "def-456",
      getName: vi.fn().mockResolvedValue("stale name · 12345678"),
      setName,
      getRootElement: vi.fn().mockResolvedValue({ type: "DOM" as const, ...dom }),
    } as unknown as Component;

    const getComponent = vi.fn().mockResolvedValue(def);
    const getComponentByName = vi.fn();
    const searchComponents = vi.fn();
    installWebflow({ getComponent, getComponentByName, searchComponents });

    const out = await getBeaconListTargetComponentOrNull(DATA_LIST, listContainer, "def-456");
    expect(out).toBe(def);
    expect(getComponent).toHaveBeenCalledWith("def-456");
    expect(getComponentByName).not.toHaveBeenCalled();
    expect(searchComponents).not.toHaveBeenCalled();
    const expected = uniqueBeaconListTargetComponentName(DATA_LIST, listContainer);
    expect(setName).toHaveBeenCalledWith(expected);
    expect(dom.setAttribute).toHaveBeenCalled();
    expect(dom.setAttribute).toHaveBeenCalledWith("data-beacon-list-element-id", listContainer.id.element);
    expect(dom.setAttribute).toHaveBeenCalledWith("data-beacon-list-component-id", listContainer.id.component);
  });

  it("ignores a hint whose root data-list does not match (does not clobber); falls back to name", async () => {
    const listContainer = makeListContainer();
    const dom = makeListTargetDomRoot({
      "data-target": "beacons",
      "data-list": "beacon-someone-else",
      "data-beacon-list-element-id": "x",
      "data-beacon-list-component-id": "y",
      "data-beacon-target": "list",
    });
    const wrongListDef = {
      id: "def-wrong",
      getName: vi.fn().mockResolvedValue("x"),
      setName: vi.fn().mockResolvedValue(undefined),
      getRootElement: vi.fn().mockResolvedValue({ type: "DOM" as const, ...dom }),
    } as unknown as Component;

    const byName = {
      id: "def-correct",
      getName: vi.fn().mockResolvedValue(uniqueBeaconListTargetComponentName(DATA_LIST, listContainer)),
    } as unknown as Component;

    const getComponent = vi.fn().mockResolvedValue(wrongListDef);
    const getComponentByName = vi.fn().mockResolvedValue(byName);
    const searchComponents = vi.fn();
    installWebflow({ getComponent, getComponentByName, searchComponents });

    const out = await getBeaconListTargetComponentOrNull(DATA_LIST, listContainer, "def-wrong");
    expect(out).toBe(byName);
    expect(getComponentByName).toHaveBeenCalledWith(
      BEACON_UTILITIES_COMPONENT_GROUP,
      uniqueBeaconListTargetComponentName(DATA_LIST, listContainer)
    );
  });

  it("on ResourceMissing for hint, falls back to getComponentByName", async () => {
    const listContainer = makeListContainer();
    const byName = { id: "def-fallback" } as unknown as Component;
    const getComponent = vi.fn().mockRejectedValue({ message: "missing", cause: { tag: "ResourceMissing" } });
    const getComponentByName = vi.fn().mockResolvedValue(byName);
    const searchComponents = vi.fn();
    installWebflow({ getComponent, getComponentByName, searchComponents });

    const out = await getBeaconListTargetComponentOrNull(DATA_LIST, listContainer, "gone-id");
    expect(out).toBe(byName);
    expect(getComponentByName).toHaveBeenCalled();
  });
});
