import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  computeImagePageStructureKey,
  imagePageTargetsToCacheRecords,
  invalidateImagePageTargetScanCache,
  readImagePageTargetScanCache,
  rebindImagePageTargetsFromCache,
  writeImagePageTargetScanCache,
} from "@/features/image-editor/lib/image-page-target-scan-cache";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";

function imageTarget(element: AnyElement): ImagePageTarget {
  return {
    id: "image-0",
    kind: "image",
    element,
    label: "Image",
  };
}

describe("image-page-target-scan-cache", () => {
  beforeEach(() => {
    invalidateImagePageTargetScanCache();
  });

  it("computes a stable structure key regardless of collected element order", () => {
    const a = { id: { component: "page_1", element: "a" } } as AnyElement;
    const b = { id: { component: "page_1", element: "b" } } as AnyElement;

    expect(computeImagePageStructureKey([a, b])).toBe("page_1|a\u0000page_1|b");
    expect(computeImagePageStructureKey([b, a])).toBe(computeImagePageStructureKey([a, b]));
  });

  it("uses stable fallback keys when component and element ids are missing", () => {
    const first = { id: { slot: "slot_1", component: "page_1" } } as { id: object };
    const second = { id: { component: "page_1", slot: "slot_1" } } as { id: object };

    expect(computeImagePageStructureKey([first as AnyElement])).toBe(
      computeImagePageStructureKey([second as AnyElement])
    );
  });

  it("rebinds cached records onto fresh element handles", () => {
    const stale = { id: { component: "page_1", element: "img_1" }, type: "Image" } as AnyElement;
    const fresh = { id: { component: "page_1", element: "img_1" }, type: "Image" } as AnyElement;
    const records = imagePageTargetsToCacheRecords([imageTarget(stale)]);

    const rebound = rebindImagePageTargetsFromCache(records, [fresh]);

    expect(rebound).toHaveLength(1);
    expect(rebound[0]?.element).toBe(fresh);
    expect(rebound[0]?.label).toBe("Image");
  });

  it("stores scan results per page id", () => {
    writeImagePageTargetScanCache("page_1", "structure-a", [
      { kind: "image", elementKey: "page_1|img", label: "Image" },
    ]);
    writeImagePageTargetScanCache("page_2", "structure-b", [
      { kind: "image", elementKey: "page_2|img", label: "Hero" },
    ]);

    expect(readImagePageTargetScanCache("page_1", "structure-a")).toHaveLength(1);
    expect(readImagePageTargetScanCache("page_2", "structure-b")).toHaveLength(1);
    expect(readImagePageTargetScanCache("page_1", "structure-b")).toBeNull();
  });

  it("returns null when the structure key does not match", () => {
    writeImagePageTargetScanCache("page_1", "structure-a", [
      { kind: "image", elementKey: "page_1|img", label: "Image" },
    ]);

    expect(readImagePageTargetScanCache("page_1", "structure-b")).toBeNull();
  });

  it("clears cached scan data", () => {
    writeImagePageTargetScanCache("page_1", "structure-a", [
      { kind: "image", elementKey: "page_1|img", label: "Image" },
    ]);

    invalidateImagePageTargetScanCache();

    expect(readImagePageTargetScanCache("page_1", "structure-a")).toBeNull();
  });

  it("retains per-page scan cache across Designer page changes", () => {
    const subscribe = vi.fn((_event: string, handler: () => void) => {
      (globalThis as { __pageHandler?: () => void }).__pageHandler = handler;
      return () => {};
    });
    vi.stubGlobal("webflow", { subscribe });

    writeImagePageTargetScanCache("page_1", "structure-a", [
      { kind: "image", elementKey: "page_1|img", label: "Image" },
    ]);
    writeImagePageTargetScanCache("page_2", "structure-b", [
      { kind: "image", elementKey: "page_2|img", label: "Hero" },
    ]);
    readImagePageTargetScanCache("page_1", "structure-a");

    (globalThis as { __pageHandler?: () => void }).__pageHandler?.();

    expect(readImagePageTargetScanCache("page_1", "structure-a")).toHaveLength(1);
    expect(readImagePageTargetScanCache("page_2", "structure-b")).toHaveLength(1);
  });
});
