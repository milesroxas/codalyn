import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  openQualityComparePopout,
  QUALITY_COMPARE_POPOUT_PAGE,
} from "@/features/image-editor/lib/open-quality-compare-popout";
import {
  BEACON_QUALITY_PARENT_SOURCE,
  BEACON_QUALITY_POPOUT_SOURCE,
} from "@/features/image-editor/lib/quality-popout-protocol";

describe("openQualityComparePopout", () => {
  const targetOrigin = "http://localhost:1337";
  let mockPopWin: { focus: () => void; closed: boolean; postMessage: ReturnType<typeof vi.fn> };
  let openSpy: ReturnType<typeof vi.fn>;
  let setIntervalSpy: ReturnType<typeof vi.fn>;
  let clearIntervalSpy: ReturnType<typeof vi.fn>;
  let addEventListenerSpy: ReturnType<typeof vi.fn>;
  let removeEventListenerSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPopWin = { focus: vi.fn(), closed: false, postMessage: vi.fn() };
    openSpy = vi.fn(() => mockPopWin as unknown as Window);
    setIntervalSpy = vi.fn(() => 1);
    clearIntervalSpy = vi.fn();
    addEventListenerSpy = vi.fn();
    removeEventListenerSpy = vi.fn();
    vi.stubGlobal("window", {
      open: openSpy,
      setInterval: setIntervalSpy,
      clearInterval: clearIntervalSpy,
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
      location: { href: `${targetOrigin}/index.html`, origin: targetOrigin },
    } as unknown as Window & typeof globalThis);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  function readyListener(): (event: MessageEvent) => void {
    const call = addEventListenerSpy.mock.calls.find((c) => c[0] === "message");
    expect(call).toBeDefined();
    return (call as unknown[])[1] as (event: MessageEvent) => void;
  }

  function fireReady(overrides?: Partial<{ origin: string; source: unknown; data: unknown }>) {
    readyListener()({
      origin: targetOrigin,
      source: mockPopWin,
      data: { source: BEACON_QUALITY_POPOUT_SOURCE, type: "ready" },
      ...overrides,
    } as MessageEvent);
  }

  it("returns null when the popup is blocked", () => {
    openSpy.mockReturnValue(null);
    expect(openWith()).toBeNull();
    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it("opens the static bundled page at a same-origin URL (no blob document)", () => {
    const win = openWith();
    expect(win).toBeDefined();
    expect(openSpy).toHaveBeenCalledWith(
      `${targetOrigin}/${QUALITY_COMPARE_POPOUT_PAGE}`,
      "beacon-quality-compare",
      expect.stringContaining("width=1120")
    );
    expect(mockPopWin.focus).toHaveBeenCalled();
  });

  it("answers the popout's ready message with an init payload, then detaches", () => {
    openWith({ aspectRatio: 1.5, initialQuality: 0.42 });
    expect(mockPopWin.postMessage).not.toHaveBeenCalled();

    fireReady();
    expect(mockPopWin.postMessage).toHaveBeenCalledTimes(1);
    const [message, origin] = mockPopWin.postMessage.mock.calls[0] as [Record<string, unknown>, string];
    expect(origin).toBe(targetOrigin);
    expect(message.source).toBe(BEACON_QUALITY_PARENT_SOURCE);
    expect(message.type).toBe("init");
    expect(message.originalBlob).toBeInstanceOf(Blob);
    expect(message.compressedBlob).toBeInstanceOf(Blob);
    expect(message.aspectRatio).toBe(1.5);
    expect(message.initialQuality).toBe(0.42);

    expect(removeEventListenerSpy).toHaveBeenCalledWith("message", readyListener());
    expect(clearIntervalSpy).toHaveBeenCalledWith(1);
  });

  it("ignores ready messages from another origin or window", () => {
    openWith();
    fireReady({ origin: "https://evil.example" });
    fireReady({ source: {} });
    fireReady({ data: { source: "someone-else", type: "ready" } });
    expect(mockPopWin.postMessage).not.toHaveBeenCalled();
    expect(removeEventListenerSpy).not.toHaveBeenCalled();
  });

  it("falls back to aspect ratio 1 and clamps quality into export range", () => {
    openWith({ aspectRatio: Number.NaN, initialQuality: 0.01 });
    fireReady();
    const [message] = mockPopWin.postMessage.mock.calls[0] as [Record<string, unknown>];
    expect(message.aspectRatio).toBe(1);
    expect(message.initialQuality).toBe(0.05);
  });

  it("drops the ready listener when the popout closes before announcing itself", () => {
    openWith();
    const tick = setIntervalSpy.mock.calls[0]?.[0] as () => void;

    tick();
    expect(removeEventListenerSpy).not.toHaveBeenCalled();

    mockPopWin.closed = true;
    tick();
    expect(clearIntervalSpy).toHaveBeenCalledWith(1);
    expect(removeEventListenerSpy).toHaveBeenCalledWith("message", readyListener());
  });
});
