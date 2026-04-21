import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { openQualityComparePopout } from "@/features/image-editor/lib/open-quality-compare-popout";
import {
  BEACON_QUALITY_PARENT_SOURCE,
  BEACON_QUALITY_POPOUT_SOURCE,
} from "@/features/image-editor/lib/quality-popout-protocol";

describe("openQualityComparePopout", () => {
  const targetOrigin = "http://localhost:1337";
  let html = "";
  let mockPopWin: {
    document: { open: () => void; write: (s: string) => void; close: () => void };
    focus: () => void;
    URL: typeof URL;
  };
  let openSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    html = "";
    mockPopWin = {
      document: {
        open: vi.fn(),
        write: vi.fn((s: string) => {
          html += s;
        }),
        close: vi.fn(),
      },
      focus: vi.fn(),
      URL: globalThis.URL,
    };
    openSpy = vi.fn(() => mockPopWin as unknown as Window);
    vi.stubGlobal("window", { open: openSpy } as unknown as Window & typeof globalThis);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when popup is blocked", () => {
    openSpy.mockReturnValue(null);
    const out = openQualityComparePopout({
      originalBlob: new Blob(["a"], { type: "image/png" }),
      compressedBlob: new Blob(["b"], { type: "image/webp" }),
      aspectRatio: 1,
      initialQuality: 0.8,
      targetOrigin,
    });
    expect(out).toBeNull();
  });

  it("opens named popup, writes compare document, wires protocol sources and target origin", () => {
    const orig = new Blob(["a"], { type: "image/png" });
    const comp = new Blob(["b"], { type: "image/webp" });
    const win = openQualityComparePopout({
      originalBlob: orig,
      compressedBlob: comp,
      aspectRatio: 1.5,
      initialQuality: 0.42,
      targetOrigin,
    });

    expect(win).toBeDefined();
    expect(openSpy).toHaveBeenCalledWith("", "beacon-quality-compare", expect.stringContaining("width=1120"));
    expect(mockPopWin.document.open).toHaveBeenCalled();
    expect(mockPopWin.document.close).toHaveBeenCalled();
    expect(mockPopWin.focus).toHaveBeenCalled();

    expect(html).toContain("aspect-ratio: 1.5");
    expect(html).toContain('value="0.42"');
    expect(html).toContain(JSON.stringify(BEACON_QUALITY_POPOUT_SOURCE));
    expect(html).toContain(JSON.stringify(BEACON_QUALITY_PARENT_SOURCE));
    expect(html).toContain(JSON.stringify(targetOrigin));
    expect(html).toContain("postMessage");
    expect(html).toContain("preview-quality-changed");
    expect(html).toContain("save-and-close");
  });

  it("falls back to aspect ratio 1 when ratio is invalid", () => {
    openQualityComparePopout({
      originalBlob: new Blob(["a"]),
      compressedBlob: new Blob(["b"]),
      aspectRatio: Number.NaN,
      initialQuality: 0.9,
      targetOrigin,
    });
    expect(html).toContain("aspect-ratio: 1");
  });

  it("clamps initial quality into export range in markup", () => {
    openQualityComparePopout({
      originalBlob: new Blob(["a"]),
      compressedBlob: new Blob(["b"]),
      aspectRatio: 1,
      initialQuality: 0.01,
      targetOrigin,
    });
    expect(html).toContain('value="0.05"');
  });
});
