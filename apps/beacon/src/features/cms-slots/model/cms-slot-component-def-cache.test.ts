import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cachedComponentName,
  cachedComponentPropOrder,
  cachedComponentSettings,
  clearCmsSlotComponentDefCache,
  getCachedComponentById,
  seedCachedComponent,
} from "@/features/cms-slots/model/cms-slot-component-def-cache";

type FakeComponent = {
  id: string;
  getName: ReturnType<typeof vi.fn>;
  getProps: ReturnType<typeof vi.fn>;
  getSettings: ReturnType<typeof vi.fn>;
};

function fakeComponent(id: string): FakeComponent {
  return {
    id,
    getName: vi.fn(async () => `name:${id}`),
    getProps: vi.fn(async () => [{ id: "p1" }, { id: "p2" }]),
    getSettings: vi.fn(async () => ({ group: `group:${id}` })),
  };
}

describe("cms-slot-component-def-cache", () => {
  beforeEach(() => {
    clearCmsSlotComponentDefCache();
    vi.restoreAllMocks();
  });

  it("caches name/propOrder/settings by component id so each underlying read runs once", async () => {
    const comp = fakeComponent("c1") as unknown as Component;

    const [n1, n2] = await Promise.all([cachedComponentName(comp), cachedComponentName(comp)]);
    expect(n1).toBe("name:c1");
    expect(n2).toBe("name:c1");
    expect((comp as unknown as FakeComponent).getName).toHaveBeenCalledTimes(1);

    expect(await cachedComponentPropOrder(comp)).toEqual(["p1", "p2"]);
    expect(await cachedComponentPropOrder(comp)).toEqual(["p1", "p2"]);
    expect((comp as unknown as FakeComponent).getProps).toHaveBeenCalledTimes(1);

    expect((await cachedComponentSettings(comp)).group).toBe("group:c1");
    expect((await cachedComponentSettings(comp)).group).toBe("group:c1");
    expect((comp as unknown as FakeComponent).getSettings).toHaveBeenCalledTimes(1);
  });

  it("keys by component.id, so two handles of the same id share one read", async () => {
    const a = fakeComponent("same") as unknown as Component;
    const b = fakeComponent("same") as unknown as Component;
    await cachedComponentName(a);
    await cachedComponentName(b);
    // First handle resolved the value; the second id-keyed lookup reuses it.
    expect((a as unknown as FakeComponent).getName).toHaveBeenCalledTimes(1);
    expect((b as unknown as FakeComponent).getName).toHaveBeenCalledTimes(0);
  });

  it("re-reads after clear", async () => {
    const comp = fakeComponent("c1") as unknown as Component;
    await cachedComponentName(comp);
    clearCmsSlotComponentDefCache();
    await cachedComponentName(comp);
    expect((comp as unknown as FakeComponent).getName).toHaveBeenCalledTimes(2);
  });

  it("propOrder returns undefined when getProps rejects (does not throw)", async () => {
    const comp = fakeComponent("bad") as unknown as Component;
    (comp as unknown as FakeComponent).getProps.mockRejectedValueOnce(new Error("boom"));
    expect(await cachedComponentPropOrder(comp)).toBeUndefined();
  });

  it("getCachedComponentById dedupes the webflow fetch and serves a seeded handle without fetching", async () => {
    const seeded = fakeComponent("seeded") as unknown as Component;
    seedCachedComponent(seeded);

    const getComponent = vi.fn(async (id: string) => fakeComponent(id) as unknown as Component);
    vi.stubGlobal("webflow", { getComponent });

    // Seeded id never hits the bridge.
    expect(await getCachedComponentById("seeded")).toBe(seeded);
    expect(getComponent).toHaveBeenCalledTimes(0);

    // Unseeded id fetches once and dedupes concurrent callers.
    const [x, y] = await Promise.all([getCachedComponentById("fresh"), getCachedComponentById("fresh")]);
    expect(x).toBe(y);
    expect(getComponent).toHaveBeenCalledTimes(1);
  });

  it("seedCachedComponent does not clobber an existing entry for the same id", async () => {
    const first = fakeComponent("dup") as unknown as Component;
    const second = fakeComponent("dup") as unknown as Component;
    seedCachedComponent(first);
    seedCachedComponent(second);
    expect(await getCachedComponentById("dup")).toBe(first);
  });
});
