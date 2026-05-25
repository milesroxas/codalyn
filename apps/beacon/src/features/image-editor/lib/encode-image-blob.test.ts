/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { encodeCanvasToOptimizedFile } from "./encode-image-blob";

vi.mock("@/shared/lib/wait-for-next-paint", () => ({
  waitForNextPaint: () => Promise.resolve(),
}));

const mockGetTowerOrigin = vi.fn(() => "");
const mockTowerFetch = vi.fn((_path: string, _init?: RequestInit) =>
  Promise.resolve(new Response(null, { status: 500 }))
);

vi.mock("@/shared/lib/tower-client", () => ({
  getTowerOrigin: () => mockGetTowerOrigin(),
  towerFetch: (path: string, init?: RequestInit) => mockTowerFetch(path, init),
}));

function stubCanvasWithWebpBlob(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 2;
  vi.spyOn(canvas, "toBlob").mockImplementation((cb: (b: Blob | null) => void) => {
    cb(new Blob([new Uint8Array([0x52, 0x49])], { type: "image/webp" }));
  });
  return canvas;
}

describe("encodeCanvasToOptimizedFile", () => {
  beforeEach(() => {
    mockGetTowerOrigin.mockReturnValue("");
    mockTowerFetch.mockReset();
  });

  it("encodes WebP in-browser without calling Tower", async () => {
    const out = await encodeCanvasToOptimizedFile(stubCanvasWithWebpBlob(), 0.8, { format: "webp" });
    expect(out.mimeType).toMatch(/webp/i);
    expect(mockTowerFetch).not.toHaveBeenCalled();
  });

  it("POSTs PNG to Tower for AVIF when origin is configured", async () => {
    mockGetTowerOrigin.mockReturnValue("http://localhost:3100");
    mockTowerFetch.mockResolvedValue(
      new Response(new Uint8Array([0, 0, 0]), {
        status: 200,
        headers: { "Content-Type": "image/avif" },
      })
    );
    const out = await encodeCanvasToOptimizedFile(stubCanvasWithWebpBlob(), 0.8, {
      format: "avif",
      baseName: "hero",
    });
    expect(mockTowerFetch).toHaveBeenCalled();
    const [url, init] = mockTowerFetch.mock.calls[0] as [string, RequestInit | undefined];
    expect(url).toContain("/api/v1/images/optimize");
    expect(url).toContain("format=avif");
    expect(init?.method).toBe("POST");
    expect(out.fileName.endsWith(".avif")).toBe(true);
  });

  it("throws TowerUsageLimitError when Tower returns 402 usage limit", async () => {
    mockGetTowerOrigin.mockReturnValue("http://localhost:3100");
    mockTowerFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "usage_limit",
          code: "TOWER_USAGE_LIMIT",
          kind: "image",
          used: 50,
          limit: 50,
        }),
        { status: 402 }
      )
    );
    await expect(encodeCanvasToOptimizedFile(stubCanvasWithWebpBlob(), 0.8, { format: "avif" })).rejects.toMatchObject({
      details: { kind: "image", used: 50, limit: 50 },
    });
  });

  it("throws when AVIF is requested but Tower origin is missing", async () => {
    mockGetTowerOrigin.mockReturnValue("");
    await expect(encodeCanvasToOptimizedFile(stubCanvasWithWebpBlob(), 0.8, { format: "avif" })).rejects.toThrow(
      /AVIF needs Tower/
    );
  });
});
