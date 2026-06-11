import { beforeEach, describe, expect, it, vi } from "vitest";

import { invalidateImagePageTargetScanCache } from "@/features/image-editor/lib/image-page-target-scan-cache";
import {
  scanImageTargetsOnPage,
  tryRestoreCachedImagePageTargets,
} from "@/features/image-editor/lib/scan-image-targets-on-page";

const WEBFLOW_IMAGE_ELEMENT_TYPE = "Image";

function pageBody(pageId: string, children: unknown[]) {
  return {
    type: "Body",
    id: { component: pageId, element: "body_1" },
    getChildren: vi.fn().mockResolvedValue(children),
  };
}

function imageElement(pageId: string, elementId: string) {
  return {
    type: WEBFLOW_IMAGE_ELEMENT_TYPE,
    id: { component: pageId, element: elementId },
  };
}

function installPage(pageId: string, children: unknown[]) {
  const body = pageBody(pageId, children);
  vi.stubGlobal("webflow", {
    getAllElements: vi.fn().mockResolvedValue([body, ...children]),
    getCurrentPage: vi.fn().mockResolvedValue({ id: pageId }),
  });
}

describe("scanImageTargetsOnPage", () => {
  beforeEach(() => {
    invalidateImagePageTargetScanCache();
  });

  it("reuses cached scan results when page structure is unchanged", async () => {
    const image = imageElement("page_1", "img_1");
    installPage("page_1", [image]);

    const first = await scanImageTargetsOnPage({ pageId: "page_1" });
    expect(first.targets).toHaveLength(1);
    expect(first.cacheHit).toBe(false);

    const searchProps = vi.fn();
    const onProgress = vi.fn();
    installPage("page_1", [image]);
    vi.stubGlobal("webflow", {
      getAllElements: vi.fn().mockResolvedValue([pageBody("page_1", [image]), image]),
      getCurrentPage: vi.fn().mockResolvedValue({ id: "page_1" }),
      searchProps,
    });

    const second = await scanImageTargetsOnPage({ pageId: "page_1", onProgress });

    expect(second.targets).toHaveLength(1);
    expect(second.cacheHit).toBe(true);
    expect(second.targets[0]?.element).toBe(image);
    expect(searchProps).not.toHaveBeenCalled();
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("bypasses cached scan results when forceRefresh is true", async () => {
    const image = imageElement("page_1", "img_1");
    installPage("page_1", [image]);

    await scanImageTargetsOnPage({ pageId: "page_1" });

    const getAllElements = vi.fn().mockResolvedValue([pageBody("page_1", [image]), image]);
    vi.stubGlobal("webflow", {
      getAllElements,
      getCurrentPage: vi.fn().mockResolvedValue({ id: "page_1" }),
    });

    await scanImageTargetsOnPage({ pageId: "page_1", forceRefresh: true });

    expect(getAllElements.mock.calls.length).toBeGreaterThan(0);
  });

  it("reuses page A cache after scanning page B and returning to page A", async () => {
    const pageAImage = imageElement("page_a", "img_a");
    const pageBImage = imageElement("page_b", "img_b");

    installPage("page_a", [pageAImage]);
    await scanImageTargetsOnPage({ pageId: "page_a" });

    installPage("page_b", [pageBImage]);
    await scanImageTargetsOnPage({ pageId: "page_b" });

    const searchProps = vi.fn();
    installPage("page_a", [pageAImage]);
    vi.stubGlobal("webflow", {
      getAllElements: vi.fn().mockResolvedValue([pageBody("page_a", [pageAImage]), pageAImage]),
      getCurrentPage: vi.fn().mockResolvedValue({ id: "page_a" }),
      searchProps,
    });

    const third = await scanImageTargetsOnPage({ pageId: "page_a" });

    expect(third.targets).toHaveLength(1);
    expect(third.cacheHit).toBe(true);
    expect(third.targets[0]?.element).toBe(pageAImage);
    expect(searchProps).not.toHaveBeenCalled();
  });

  it("restores cached targets without running the scanning phase", async () => {
    const image = imageElement("page_1", "img_1");
    installPage("page_1", [image]);

    await scanImageTargetsOnPage({ pageId: "page_1" });

    const searchProps = vi.fn();
    installPage("page_1", [image]);
    vi.stubGlobal("webflow", {
      getAllElements: vi.fn().mockResolvedValue([pageBody("page_1", [image]), image]),
      getCurrentPage: vi.fn().mockResolvedValue({ id: "page_1" }),
      searchProps,
    });

    const restored = await tryRestoreCachedImagePageTargets("page_1");

    expect(restored).toHaveLength(1);
    expect(restored?.[0]?.element).toBe(image);
    expect(searchProps).not.toHaveBeenCalled();
  });
});
