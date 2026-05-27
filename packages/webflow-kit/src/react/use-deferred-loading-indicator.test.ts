/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CODALYN_LOADING_INDICATOR_DELAY_MS } from "./loading-indicator-delay.js";
import { useDeferredLoadingIndicator } from "./use-deferred-loading-indicator.js";

describe("useDeferredLoadingIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays false until the delay elapses while busy", () => {
    const { result } = renderHook(() => useDeferredLoadingIndicator(true));

    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(CODALYN_LOADING_INDICATOR_DELAY_MS - 1);
    });
    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  it("never shows when busy ends before the delay", () => {
    const { result, rerender } = renderHook(({ busy }) => useDeferredLoadingIndicator(busy), {
      initialProps: { busy: true },
    });

    act(() => {
      vi.advanceTimersByTime(CODALYN_LOADING_INDICATOR_DELAY_MS - 100);
    });
    rerender({ busy: false });
    act(() => {
      vi.runAllTimers();
    });
    expect(result.current).toBe(false);
  });

  it("clears immediately when busy becomes false after showing", () => {
    const { result, rerender } = renderHook(({ busy }) => useDeferredLoadingIndicator(busy), {
      initialProps: { busy: true },
    });

    act(() => {
      vi.advanceTimersByTime(CODALYN_LOADING_INDICATOR_DELAY_MS);
    });
    expect(result.current).toBe(true);
    rerender({ busy: false });
    expect(result.current).toBe(false);
  });

  it("does not show when a timer fires after busy already ended", () => {
    const { result, rerender } = renderHook(({ busy }) => useDeferredLoadingIndicator(busy), {
      initialProps: { busy: true },
    });

    act(() => {
      vi.advanceTimersByTime(CODALYN_LOADING_INDICATOR_DELAY_MS);
    });
    expect(result.current).toBe(true);

    rerender({ busy: false });
    expect(result.current).toBe(false);

    act(() => {
      vi.runAllTimers();
    });
    expect(result.current).toBe(false);
  });

  it("requires the full delay again after a brief busy=false gap", () => {
    const { result, rerender } = renderHook(({ busy }) => useDeferredLoadingIndicator(busy), {
      initialProps: { busy: true },
    });

    act(() => {
      vi.advanceTimersByTime(CODALYN_LOADING_INDICATOR_DELAY_MS);
    });
    expect(result.current).toBe(true);

    rerender({ busy: false });
    expect(result.current).toBe(false);

    rerender({ busy: true });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(CODALYN_LOADING_INDICATOR_DELAY_MS - 1);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  it("restarts the delay when delayMs changes while busy", () => {
    const { result, rerender } = renderHook(({ busy, delayMs }) => useDeferredLoadingIndicator(busy, delayMs), {
      initialProps: { busy: true, delayMs: CODALYN_LOADING_INDICATOR_DELAY_MS },
    });

    act(() => {
      vi.advanceTimersByTime(CODALYN_LOADING_INDICATOR_DELAY_MS - 100);
    });
    expect(result.current).toBe(false);

    rerender({ busy: true, delayMs: CODALYN_LOADING_INDICATOR_DELAY_MS + 500 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(CODALYN_LOADING_INDICATOR_DELAY_MS + 300);
    });
    expect(result.current).toBe(true);
  });
});
