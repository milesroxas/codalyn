import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CMS_SLOT_LIST_TARGET_CMS_COLLECTION_ID_ATTR,
  CMS_SLOT_LIST_TARGET_CMS_FIELD_ID_ATTR,
} from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import { CMS_SLOT_LIST_TARGET_TEXT_PROP_NAME } from "@/features/cms-slots/model/cms-slot-list-target-text-field";
import { detectCmsSlotListTargetCmsFieldLink } from "@/features/cms-slots/model/detect-cms-slot-list-target-cms-field-link";

const listContainer = {
  id: { component: "page", element: "list" },
  getCustomAttribute: vi.fn(),
} as unknown as BlockElement;

const def = {
  id: "def-1",
  getProps: vi
    .fn()
    .mockResolvedValue([
      { id: "prop-text", name: CMS_SLOT_LIST_TARGET_TEXT_PROP_NAME, type: "textContent", valueType: "textContent" },
    ]),
} as unknown as Component;

function makeInstance(value: unknown): ComponentElement {
  return {
    id: { component: "cmp", element: "el" },
    searchProps: vi.fn().mockResolvedValue([{ propId: "prop-text", value }]),
  } as unknown as ComponentElement;
}

vi.mock("@/features/cms-slots/model/cms-slot-list-target-instances-on-page", () => ({
  listCmsSlotListTargetInstancesOnPageByName: vi.fn(),
}));

vi.mock("@/features/cms-slots/model/create-cms-slot-list-target-component", () => ({
  getCmsSlotListTargetComponentOrNull: vi.fn(),
}));

import { listCmsSlotListTargetInstancesOnPageByName } from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import { getCmsSlotListTargetComponentOrNull } from "@/features/cms-slots/model/create-cms-slot-list-target-component";

describe("detectCmsSlotListTargetCmsFieldLink", () => {
  beforeEach(() => {
    vi.mocked(listContainer.getCustomAttribute).mockImplementation(async (name) => {
      if (name === CMS_SLOT_LIST_TARGET_CMS_COLLECTION_ID_ATTR) {
        return "collection-1";
      }
      if (name === CMS_SLOT_LIST_TARGET_CMS_FIELD_ID_ATTR) {
        return "field-1";
      }
      return null;
    });
    vi.mocked(getCmsSlotListTargetComponentOrNull).mockResolvedValue(def);
    vi.mocked(listCmsSlotListTargetInstancesOnPageByName).mockResolvedValue([
      makeInstance({ sourceType: "cms", collectionId: "collection-1", fieldId: "field-1" }),
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns linked when Text prop matches persisted CMS field ids", async () => {
    const result = await detectCmsSlotListTargetCmsFieldLink({
      dataList: "slot-a",
      listContainer,
    });
    expect(result).toEqual({ status: "linked" });
  });

  it("returns unlinked when Text prop is empty", async () => {
    vi.mocked(listCmsSlotListTargetInstancesOnPageByName).mockResolvedValue([makeInstance("")]);
    const result = await detectCmsSlotListTargetCmsFieldLink({
      dataList: "slot-a",
      listContainer,
    });
    expect(result).toEqual({
      status: "unlinked",
      binding: { collectionId: "collection-1", fieldId: "field-1" },
    });
  });

  it("returns unlinked when Text prop binds to a different CMS field", async () => {
    vi.mocked(listCmsSlotListTargetInstancesOnPageByName).mockResolvedValue([
      makeInstance({ sourceType: "cms", collectionId: "collection-1", fieldId: "other-field" }),
    ]);
    const result = await detectCmsSlotListTargetCmsFieldLink({
      dataList: "slot-a",
      listContainer,
    });
    expect(result.status).toBe("unlinked");
  });

  it("returns skipped when list block has no persisted CMS field ids", async () => {
    vi.mocked(listContainer.getCustomAttribute).mockResolvedValue(null);
    const result = await detectCmsSlotListTargetCmsFieldLink({
      dataList: "slot-a",
      listContainer,
    });
    expect(result).toEqual({ status: "skipped" });
  });

  it("returns skipped when no list-target instances are on the page", async () => {
    vi.mocked(listCmsSlotListTargetInstancesOnPageByName).mockResolvedValue([]);
    const result = await detectCmsSlotListTargetCmsFieldLink({
      dataList: "slot-a",
      listContainer,
    });
    expect(result).toEqual({ status: "skipped" });
  });
});
