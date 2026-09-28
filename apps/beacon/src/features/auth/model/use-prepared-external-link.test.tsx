// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePreparedExternalLink } from "./use-prepared-external-link";

const URL_1 = "https://webflow.com/oauth/authorize?state=one";
const URL_2 = "https://webflow.com/oauth/authorize?state=two";

/**
 * Review round 9 (2026-09-28): a destination Tower mints (OAuth state, handoff token) is requested only
 * after the user's explicit action — never when the surface mounts — and is never silently re-minted.
 */
describe("usePreparedExternalLink", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("requests nothing on mount and mints only on prepare()", async () => {
    const prepareUrl = vi.fn(async () => ({ ok: true as const, url: URL_1 }));
    const { result } = renderHook(() => usePreparedExternalLink(prepareUrl, { staleMs: 60_000 }));

    expect(result.current.state).toEqual({ kind: "idle" });
    expect(result.current.linkProps).toBeNull();
    expect(prepareUrl).not.toHaveBeenCalled();

    act(() => result.current.prepare());
    expect(result.current.state).toEqual({ kind: "preparing" });
    await act(async () => {
      await Promise.resolve();
    });
    expect(prepareUrl).toHaveBeenCalledTimes(1);
    expect(result.current.state).toMatchObject({ kind: "ready", url: URL_1 });
    expect(result.current.linkProps).toMatchObject({ href: URL_1, target: "_blank", rel: "noopener noreferrer" });
  });

  it("single-flights concurrent prepare() calls", async () => {
    const prepareUrl = vi.fn(async () => ({ ok: true as const, url: URL_1 }));
    const { result } = renderHook(() => usePreparedExternalLink(prepareUrl, { staleMs: 60_000 }));
    act(() => {
      result.current.prepare();
      result.current.prepare();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(prepareUrl).toHaveBeenCalledTimes(1);
  });

  it("surfaces a failed mint as an error and mints again only on the next prepare()", async () => {
    const prepareUrl = vi
      .fn<() => Promise<{ ok: true; url: string } | { ok: false; error: string }>>()
      .mockResolvedValueOnce({ ok: false, error: "team_admin_required" })
      .mockResolvedValueOnce({ ok: true, url: URL_2 });
    const { result } = renderHook(() => usePreparedExternalLink(prepareUrl, { staleMs: 60_000 }));

    act(() => result.current.prepare());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.state).toEqual({ kind: "error", error: "team_admin_required" });
    expect(result.current.linkProps).toBeNull();

    act(() => result.current.prepare());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.state).toMatchObject({ kind: "ready", url: URL_2 });
    expect(prepareUrl).toHaveBeenCalledTimes(2);
  });

  it("returns to idle on hover/focus once the destination is stale — no re-mint behind the user's back", async () => {
    const prepareUrl = vi.fn(async () => ({ ok: true as const, url: URL_1 }));
    const { result } = renderHook(() => usePreparedExternalLink(prepareUrl, { staleMs: 1_000 }));
    act(() => result.current.prepare());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.state.kind).toBe("ready");

    // Fresh: hover keeps the link.
    act(() => result.current.linkProps?.onPointerEnter());
    expect(result.current.state.kind).toBe("ready");

    vi.advanceTimersByTime(1_000);
    act(() => result.current.linkProps?.onFocus());
    expect(result.current.state).toEqual({ kind: "idle" });
    expect(prepareUrl).toHaveBeenCalledTimes(1);
  });

  it("runs onOpen on the click and forgets the consumed destination afterwards", async () => {
    const prepareUrl = vi.fn(async () => ({ ok: true as const, url: URL_1 }));
    const onOpen = vi.fn();
    const { result } = renderHook(() => usePreparedExternalLink(prepareUrl, { staleMs: 60_000, onOpen }));
    act(() => result.current.prepare());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => result.current.linkProps?.onClick());
    expect(onOpen).toHaveBeenCalledTimes(1);
    // The anchor stays for the navigation in flight, then the single-use destination is dropped.
    expect(result.current.state.kind).toBe("ready");
    act(() => {
      vi.advanceTimersByTime(1_500);
    });
    expect(result.current.state).toEqual({ kind: "idle" });
    expect(prepareUrl).toHaveBeenCalledTimes(1);
  });

  it("ignores a mint that resolves after unmount", async () => {
    let resolve: ((r: { ok: true; url: string }) => void) | undefined;
    const prepareUrl = vi.fn(
      () =>
        new Promise<{ ok: true; url: string }>((r) => {
          resolve = r;
        })
    );
    const { result, unmount } = renderHook(() => usePreparedExternalLink(prepareUrl, { staleMs: 60_000 }));
    act(() => result.current.prepare());
    unmount();
    await act(async () => {
      resolve?.({ ok: true, url: URL_1 });
      await Promise.resolve();
    });
    // No state update after unmount (React would warn); nothing else to observe.
    expect(prepareUrl).toHaveBeenCalledTimes(1);
  });
});
