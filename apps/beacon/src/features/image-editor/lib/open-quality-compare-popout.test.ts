import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { openQualityComparePopout } from "@/features/image-editor/lib/open-quality-compare-popout";
import {
  BEACON_QUALITY_PARENT_SOURCE,
  BEACON_QUALITY_POPOUT_SOURCE,
} from "@/features/image-editor/lib/quality-popout-protocol";

describe("openQualityComparePopout", () => {
  const targetOrigin = "http://localhost:1337";
  let createdBlobs: Blob[];
  let mockPopWin: { focus: () => void; closed: boolean };
  let openSpy: ReturnType<typeof vi.fn>;
  let setIntervalSpy: ReturnType<typeof vi.fn>;
  let clearIntervalSpy: ReturnType<typeof vi.fn>;
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createdBlobs = [];
    mockPopWin = { focus: vi.fn(), closed: false };
    openSpy = vi.fn(() => mockPopWin as unknown as Window);
    setIntervalSpy = vi.fn(() => 1);
    clearIntervalSpy = vi.fn();
    createObjectURLSpy = vi.fn((blob: Blob) => {
      createdBlobs.push(blob);
      return `blob:mock-${createdBlobs.length}`;
    });
    revokeObjectURLSpy = vi.fn();
    vi.stubGlobal("window", {
      open: openSpy,
      setInterval: setIntervalSpy,
      clearInterval: clearIntervalSpy,
    } as unknown as Window & typeof globalThis);
    vi.stubGlobal("URL", {
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: revokeObjectURLSpy,
    } as unknown as typeof URL);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** The compare document is minted as a text/html Blob URL (never document.write). */
  async function renderedHtml(): Promise<string> {
    const htmlBlob = createdBlobs.find((b) => b.type === "text/html");
    expect(htmlBlob).toBeDefined();
    return await (htmlBlob as Blob).text();
  }

  function openWith(overrides?: Partial<Parameters<typeof openQualityComparePopout>[0]>) {
    return openQualityComparePopout({
      originalBlob: new Blob(["a"], { type: "image/png" }),
      compressedBlob: new Blob(["b"], { type: "image/webp" }),
      aspectRatio: 1,
      initialQuality: 0.8,
      targetOrigin,
      ...overrides,
    });
  }

  it("returns null and revokes minted blob URLs when popup is blocked", () => {
    openSpy.mockReturnValue(null);
    const out = openWith();
    expect(out).toBeNull();
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(3);
  });

  it("opens named popup at a blob URL, wires protocol sources and target origin", async () => {
    const win = openWith({ aspectRatio: 1.5, initialQuality: 0.42 });

    expect(win).toBeDefined();
    // originalSrc (1), compressedSrc (2), then the html document itself (3).
    expect(openSpy).toHaveBeenCalledWith(
      "blob:mock-3",
      "beacon-quality-compare",
      expect.stringContaining("width=1120")
    );
    expect(mockPopWin.focus).toHaveBeenCalled();

    const html = await renderedHtml();
    expect(html).toContain("aspect-ratio: 1.5");
    expect(html).toContain('value="0.42"');
    expect(html).toContain('src="blob:mock-1"');
    expect(html).toContain('src="blob:mock-2"');
    expect(html).toContain(JSON.stringify(BEACON_QUALITY_POPOUT_SOURCE));
    expect(html).toContain(JSON.stringify(BEACON_QUALITY_PARENT_SOURCE));
    expect(html).toContain(JSON.stringify(targetOrigin));
    expect(html).toContain("postMessage");
    expect(html).toContain("preview-quality-changed");
    expect(html).toContain("save-and-close");
  });

  it("revokes all minted blob URLs once the popout closes", () => {
    openWith();
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    const tick = setIntervalSpy.mock.calls[0]?.[0] as () => void;

    tick();
    expect(revokeObjectURLSpy).not.toHaveBeenCalled();

    mockPopWin.closed = true;
    tick();
    expect(clearIntervalSpy).toHaveBeenCalledWith(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-1");
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-2");
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-3");
  });

  it("falls back to aspect ratio 1 when ratio is invalid", async () => {
    openWith({ aspectRatio: Number.NaN, initialQuality: 0.9 });
    expect(await renderedHtml()).toContain("aspect-ratio: 1");
  });

  it("clamps initial quality into export range in markup", async () => {
    openWith({ initialQuality: 0.01 });
    expect(await renderedHtml()).toContain('value="0.05"');
  });
});
