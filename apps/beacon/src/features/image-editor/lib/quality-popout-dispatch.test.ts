import { afterEach, describe, expect, it, vi } from "vitest";

import { dispatchQualityPopoutMessage } from "@/features/image-editor/lib/quality-popout-dispatch";
import { BEACON_QUALITY_POPOUT_SOURCE } from "@/features/image-editor/lib/quality-popout-protocol";

describe("dispatchQualityPopoutMessage", () => {
  const targetOrigin = "https://example.test";

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeRefs(popout: Window | null) {
    return {
      popoutWindowRef: { current: popout },
      debounceTimerRef: { current: null as number | null },
    };
  }

  it("ignores messages from wrong origin", () => {
    const mockPop = {} as Window;
    const { popoutWindowRef, debounceTimerRef } = makeRefs(mockPop);
    const requestPreview = vi.fn();
    const setQuality = vi.fn();
    const onCommit = vi.fn();
    const ev = {
      origin: "https://evil.test",
      source: mockPop,
      data: {
        source: BEACON_QUALITY_POPOUT_SOURCE,
        type: "preview-quality-changed",
        quality: 0.5,
      },
    } as MessageEvent;
    dispatchQualityPopoutMessage(
      ev,
      targetOrigin,
      popoutWindowRef,
      debounceTimerRef,
      requestPreview,
      setQuality,
      onCommit
    );
    expect(requestPreview).not.toHaveBeenCalled();
  });

  it("ignores messages when event.source is not the tracked popout window", () => {
    const mockPop = {} as Window;
    const other = {} as Window;
    const { popoutWindowRef, debounceTimerRef } = makeRefs(mockPop);
    const requestPreview = vi.fn();
    const ev = {
      origin: targetOrigin,
      source: other,
      data: {
        source: BEACON_QUALITY_POPOUT_SOURCE,
        type: "preview-quality-changed",
        quality: 0.5,
      },
    } as MessageEvent;
    dispatchQualityPopoutMessage(ev, targetOrigin, popoutWindowRef, debounceTimerRef, requestPreview, vi.fn(), vi.fn());
    expect(requestPreview).not.toHaveBeenCalled();
  });

  it("schedules debounced preview on preview-quality-changed", () => {
    vi.useFakeTimers();
    const mockPop = {} as Window;
    const { popoutWindowRef, debounceTimerRef } = makeRefs(mockPop);
    const requestPreview = vi.fn();
    const ev = {
      origin: targetOrigin,
      source: mockPop,
      data: {
        source: BEACON_QUALITY_POPOUT_SOURCE,
        type: "preview-quality-changed",
        quality: 0.33,
      },
    } as MessageEvent;
    dispatchQualityPopoutMessage(ev, targetOrigin, popoutWindowRef, debounceTimerRef, requestPreview, vi.fn(), vi.fn());
    expect(requestPreview).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(requestPreview).toHaveBeenCalledTimes(1);
    expect(requestPreview).toHaveBeenCalledWith(0.33);
  });

  it("clamps quality for preview requests", () => {
    vi.useFakeTimers();
    const mockPop = {} as Window;
    const { popoutWindowRef, debounceTimerRef } = makeRefs(mockPop);
    const requestPreview = vi.fn();
    const ev = {
      origin: targetOrigin,
      source: mockPop,
      data: {
        source: BEACON_QUALITY_POPOUT_SOURCE,
        type: "preview-quality-changed",
        quality: 0.001,
      },
    } as MessageEvent;
    dispatchQualityPopoutMessage(ev, targetOrigin, popoutWindowRef, debounceTimerRef, requestPreview, vi.fn(), vi.fn());
    vi.advanceTimersByTime(400);
    expect(requestPreview).toHaveBeenCalledWith(0.05);
  });

  it("on save-and-close sets quality, commits, closes popout, clears ref", () => {
    const close = vi.fn();
    const mockPop = { close } as unknown as Window;
    const { popoutWindowRef, debounceTimerRef } = makeRefs(mockPop);
    const setQuality = vi.fn();
    const onCommit = vi.fn();
    const ev = {
      origin: targetOrigin,
      source: mockPop,
      data: {
        source: BEACON_QUALITY_POPOUT_SOURCE,
        type: "save-and-close",
        quality: 0.88,
      },
    } as MessageEvent;
    dispatchQualityPopoutMessage(ev, targetOrigin, popoutWindowRef, debounceTimerRef, vi.fn(), setQuality, onCommit);
    expect(setQuality).toHaveBeenCalledWith(0.88);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(popoutWindowRef.current).toBeNull();
  });
});
