import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tryBindCmsSlotListTargetInstanceTextToCms } from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import { CMS_SLOT_LIST_TARGET_TEXT_PROP_NAME } from "@/features/cms-slots/model/cms-slot-list-target-text-field";

type PropRow = Pick<Prop, "id" | "name" | "type" | "valueType">;

function textProp(id = "prop-text"): PropRow {
  return { id, name: CMS_SLOT_LIST_TARGET_TEXT_PROP_NAME, type: "textContent", valueType: "textContent" };
}

function makeInstance(opts: {
  def: Component;
  setProps?: (entries: ReadonlyArray<{ propId: string; value: unknown }>) => Promise<void>;
  searchProps?: () => Promise<readonly Pick<InstanceProp, "propId" | "value">[]>;
}): ComponentElement {
  return {
    id: { component: "cmp", element: "el" },
    getComponent: vi.fn().mockResolvedValue(opts.def),
    setProps: vi.fn().mockImplementation(async (entries) => {
      await opts.setProps?.(entries);
    }),
    searchProps: vi.fn().mockImplementation(async () => opts.searchProps?.() ?? []),
  } as unknown as ComponentElement;
}

function installWebflow(getCurrent: () => Promise<unknown>): {
  exitComponent: ReturnType<typeof vi.fn>;
  setSelectedElement: ReturnType<typeof vi.fn>;
} {
  const exitComponent = vi.fn().mockResolvedValue(undefined);
  const setSelectedElement = vi.fn().mockResolvedValue(undefined);
  (globalThis as unknown as { webflow: WebflowApi }).webflow = {
    getCurrentComponent: vi.fn().mockImplementation(getCurrent),
    exitComponent,
    setSelectedElement,
  } as unknown as WebflowApi;
  return { exitComponent, setSelectedElement };
}

describe("tryBindCmsSlotListTargetInstanceTextToCms", () => {
  let prev: unknown;
  beforeEach(() => {
    prev = (globalThis as { webflow?: unknown }).webflow;
  });
  afterEach(() => {
    (globalThis as { webflow?: unknown }).webflow = prev;
  });

  it("exits component edit mode, binds with slim CmsBindingInput, then verifies once via searchProps", async () => {
    const { exitComponent } = installWebflow(
      vi.fn().mockResolvedValueOnce({ id: "editing" }).mockResolvedValueOnce(null)
    );
    const def = { id: "def-1", getProps: vi.fn().mockResolvedValue([textProp("p-1")]) } as unknown as Component;
    const setProps = vi.fn();
    const searchProps = vi.fn().mockResolvedValue([
      {
        propId: "p-1",
        value: { sourceType: "cms", collectionId: "c", fieldId: "f" },
      },
    ]);
    const inst = makeInstance({ def, setProps, searchProps });

    await tryBindCmsSlotListTargetInstanceTextToCms(inst, def, { collectionId: "c", fieldId: "f" });

    expect(exitComponent).toHaveBeenCalledTimes(1);
    expect(inst.setProps).toHaveBeenCalledWith([
      { propId: "p-1", value: { sourceType: "cms", collectionId: "c", fieldId: "f" } },
    ]);
    expect(inst.searchProps).toHaveBeenCalledTimes(1);
  });

  it("throws with diagnostics when verification fails after setProps", async () => {
    installWebflow(vi.fn().mockResolvedValue(null));
    const def = { id: "def-1", getProps: vi.fn().mockResolvedValue([textProp("p-1")]) } as unknown as Component;
    const inst = makeInstance({
      def,
      searchProps: vi.fn().mockResolvedValue([
        {
          propId: "p-1",
          value: { sourceType: "cms", collectionId: "x", fieldId: "wrong-field" },
        },
      ]),
    });

    await expect(
      tryBindCmsSlotListTargetInstanceTextToCms(inst, def, { collectionId: "c", fieldId: "f" })
    ).rejects.toThrow(/verification failed after setProps/);
    expect(inst.setProps).toHaveBeenCalledTimes(1);
    expect(inst.searchProps).toHaveBeenCalled();
  });

  it("throws when the list-target Text prop is missing on the definition", async () => {
    installWebflow(vi.fn().mockResolvedValue(null));
    const def = { id: "def-1", getProps: vi.fn().mockResolvedValue([]) } as unknown as Component;
    const inst = makeInstance({ def });

    await expect(
      tryBindCmsSlotListTargetInstanceTextToCms(inst, def, { collectionId: "c", fieldId: "f" })
    ).rejects.toThrow(/Text prop is missing/);
  });
});
