import { beforeEach, describe, expect, it, vi } from "vitest";
import { CMS_SLOT_CONTENT_ATTR } from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import { syncEngineCodalynSlotPropAttributes } from "@/features/cms-slots/model/cms-slot-engine-codalyn-attr-sync";

type BoundDom = AnyElement & { store: Map<string, string> };

/** A DOM node carrying CMS slot attrs and (optionally) a content binding to one instance prop. */
function boundDom(attrs: Record<string, string>, boundPropId: string | null, children: AnyElement[] = []): BoundDom {
  const store = new Map(Object.entries(attrs));
  const settings = boundPropId == null ? {} : { text: { sourceType: "prop", propId: boundPropId } };
  return {
    type: "DOM",
    children: true,
    elementSettings: true,
    getSettings: vi.fn(async () => settings),
    getAttribute: vi.fn(async (name: string) => store.get(name) ?? null),
    setAttribute: vi.fn(async (name: string, value: string) => {
      store.set(name, value);
      return null;
    }),
    removeAttribute: vi.fn(async (name: string) => {
      store.delete(name);
      return null;
    }),
    getChildren: vi.fn(async () => children),
    store,
  } as unknown as BoundDom;
}

function exposedProp(propId: string): ComposableInstancePropMeta {
  return { propId, label: propId, valueType: "Plain Text" };
}

function instanceForRoot(root: AnyElement): ComponentElement {
  return {
    type: "ComponentInstance",
    getComponent: vi.fn(async () => ({ getRootElement: vi.fn(async () => root) })),
    getSlots: vi.fn(async () => []),
  } as unknown as ComponentElement;
}

describe("syncEngineCodalynSlotPropAttributes (re-tag after deselect)", () => {
  beforeEach(() => {
    vi.stubGlobal("webflow", {
      getCurrentComponent: vi.fn(async () => null),
      getCurrentPage: vi.fn(async () => ({ id: "page_1" })),
      openCanvas: vi.fn(async () => undefined),
      enterComponent: vi.fn(async () => undefined),
      exitComponent: vi.fn(async () => undefined),
      notify: vi.fn(async () => undefined),
    });
  });

  it("strips the stale tag from an element whose prop was deselected while another prop stays exposed", async () => {
    // Card exposed `title` + `body`; user deselects `title` and keeps `body`. The title element's stale
    // `data-cb-c="title"` segment is owned by neither the surviving exposed set nor a foreign component, so it
    // must be removed — an ownership-scoped removal keyed on the *current* exposed ids would leave it orphaned.
    const titleEl = boundDom({ [CMS_SLOT_CONTENT_ATTR]: "title" }, "title");
    const bodyEl = boundDom({ [CMS_SLOT_CONTENT_ATTR]: "body" }, "body");
    const root = boundDom({}, null, [titleEl, bodyEl]);

    const result = await syncEngineCodalynSlotPropAttributes(instanceForRoot(root), [exposedProp("body")]);

    expect(result.errors).toEqual([]);
    expect((titleEl as BoundDom).store.has(CMS_SLOT_CONTENT_ATTR)).toBe(false);
    expect((bodyEl as BoundDom).store.get(CMS_SLOT_CONTENT_ATTR)).toBe("body");
    expect(result.removed).toBe(1);
  });

  it("preserves a foreign Engine component's segment on a shared element when this slot's prop is deselected", async () => {
    // Image shared by Card (this slot, `card-image`) and Hero (another CMS slot, `hero-image`). Deselecting
    // `card-image` here must keep Hero's `hero-image` segment so multi-slot tagging stays last-write-safe.
    const sharedImg = boundDom({ [CMS_SLOT_CONTENT_ATTR]: "card-image|hero-image" }, "card-image");
    const root = boundDom({}, null, [sharedImg]);

    const result = await syncEngineCodalynSlotPropAttributes(instanceForRoot(root), [], new Set(["hero-image"]));

    expect(result.errors).toEqual([]);
    expect((sharedImg as BoundDom).store.get(CMS_SLOT_CONTENT_ATTR)).toBe("hero-image");
  });
});
