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

function stubCanvasWithWebpBlob(): OffscreenCanvas {
  // jsdom has no OffscreenCanvas; the encoder only needs `convertToBlob`.
  return {
    width: 2,
    height: 2,
    convertToBlob: vi.fn(async () => new Blob([new Uint8Array([0x52, 0x49])], { type: "image/webp" })),
  } as unknown as OffscreenCanvas;
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

  it("refuses AVIF and never contacts Tower without the explicit user opt-in", async () => {
    mockGetTowerOrigin.mockReturnValue("http://localhost:3100");
    await expect(encodeCanvasToOptimizedFile(stubCanvasWithWebpBlob(), 0.8, { format: "avif" })).rejects.toThrow(
      /requires enabling it first/
    );
    expect(mockTowerFetch).not.toHaveBeenCalled();
  });

  it("treats a non-boolean consent value as no consent (no Tower call)", async () => {
    mockGetTowerOrigin.mockReturnValue("http://localhost:3100");
    await expect(
      encodeCanvasToOptimizedFile(stubCanvasWithWebpBlob(), 0.8, {
        format: "avif",
        avifTowerConsentGranted: "yes" as unknown as boolean,
      })
    ).rejects.toThrow(/requires enabling it first/);
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
      avifTowerConsentGranted: true,
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
    await expect(
      encodeCanvasToOptimizedFile(stubCanvasWithWebpBlob(), 0.8, { format: "avif", avifTowerConsentGranted: true })
    ).rejects.toMatchObject({
      details: { kind: "image", used: 50, limit: 50 },
    });
  });

  it("throws a product-facing error when AVIF is requested but no Tower origin is configured", async () => {
    mockGetTowerOrigin.mockReturnValue("");
    await expect(
      encodeCanvasToOptimizedFile(stubCanvasWithWebpBlob(), 0.8, { format: "avif", avifTowerConsentGranted: true })
    ).rejects.toThrow("AVIF conversion isn't available in this version of Beacon. Export WebP instead.");
  });

  it("does not leak the raw Tower response body into the user-facing error", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockGetTowerOrigin.mockReturnValue("http://localhost:3100");
    mockTowerFetch.mockResolvedValue(
      new Response("Error: sharp pipeline crashed at /srv/tower/node_modules/sharp/lib/output.js:1234", {
        status: 500,
      })
    );
    await expect(
      encodeCanvasToOptimizedFile(stubCanvasWithWebpBlob(), 0.8, { format: "avif", avifTowerConsentGranted: true })
    ).rejects.toThrow(/^AVIF conversion failed \(500\)\. Try again in a moment, or export WebP instead\.$/);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("500"), expect.stringContaining("sharp pipeline"));
    warn.mockRestore();
  });

  it("asks the user to sign in when Tower returns 401", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockGetTowerOrigin.mockReturnValue("http://localhost:3100");
    mockTowerFetch.mockResolvedValue(new Response("missing bearer token", { status: 401 }));
    await expect(
      encodeCanvasToOptimizedFile(stubCanvasWithWebpBlob(), 0.8, { format: "avif", avifTowerConsentGranted: true })
    ).rejects.toThrow(/^AVIF conversion needs a signed-in account\./);
    warn.mockRestore();
  });
});
