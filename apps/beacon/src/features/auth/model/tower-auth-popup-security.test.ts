import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Popup / opener security tests (Marketplace round-8 flag). The Tower auth and Webflow OAuth popups
 * intentionally keep an opener relationship — the blank window is opened synchronously inside the
 * user gesture and navigated only after async work, and Tower's success page hands the bearer token
 * back to the opener via postMessage — so `noopener` cannot be used. These tests pin the constraints
 * that stand in for it:
 *
 * 1. popups navigate only to allowlisted destinations (Tower origin / `webflow.com/oauth/authorize`);
 * 2. token ingestion requires the exact Tower origin AND a message source this app itself opened
 *    (`isBeaconAuthWindow` registry), plus the typed message shape.
 */
vi.mock("@/shared/lib/beacon-tower-origin", () => ({
  readBeaconTowerOrigin: () => "https://tower.example",
  isBeaconTowerOriginConfigured: () => true,
}));
vi.mock("@/shared/lib/tower-client", () => ({
  towerFetch: vi.fn(),
}));

import {
  clearBeaconTowerSessionToken,
  readBeaconTowerSessionToken,
} from "@/features/auth/lib/beacon-tower-session-token";
import {
  isBeaconAuthWindow,
  openTowerAppPath,
  openWebflowOAuthAuthorize,
} from "@/features/auth/model/tower-auth-client";
import { handleTowerMessage } from "@/features/auth/model/use-beacon-tower-session";
import { towerFetch } from "@/shared/lib/tower-client";

const TOWER_ORIGIN = "https://tower.example";
const mockedTowerFetch = vi.mocked(towerFetch);

type FakeWindow = {
  closed: boolean;
  close: () => void;
  location: { replace: ReturnType<typeof vi.fn> };
};

function makeFakeWindow(): FakeWindow {
  const win: FakeWindow = {
    closed: false,
    close: vi.fn(() => {
      win.closed = true;
    }),
    location: { replace: vi.fn() },
  };
  return win;
}

const windowOpen = vi.fn<(url: string, target?: string, features?: string) => FakeWindow | null>();

function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Opens an auth popup through the real production path so the window lands in the opened-window registry. */
function openRegisteredAuthWindow(): FakeWindow {
  const win = makeFakeWindow();
  windowOpen.mockReturnValueOnce(win);
  openTowerAppPath("/dashboard", { popup: true });
  return win;
}

beforeEach(() => {
  vi.stubGlobal("window", { open: windowOpen });
  windowOpen.mockReturnValue(makeFakeWindow());
  clearBeaconTowerSessionToken();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("isBeaconAuthWindow", () => {
  it("rejects a null source", () => {
    expect(isBeaconAuthWindow(null)).toBe(false);
  });

  it("rejects a window this app did not open", () => {
    const stranger = { name: "stranger" } as unknown as MessageEventSource;
    expect(isBeaconAuthWindow(stranger)).toBe(false);
  });

  it("accepts a window opened by openTowerAppPath while it is open", () => {
    const win = openRegisteredAuthWindow();
    expect(isBeaconAuthWindow(win as unknown as MessageEventSource)).toBe(true);
  });

  it("rejects (and prunes) a registered window once it is closed", () => {
    const win = openRegisteredAuthWindow();
    win.closed = true;
    expect(isBeaconAuthWindow(win as unknown as MessageEventSource)).toBe(false);
    // Second call after pruning: still rejected, even if the handle is reused with `closed` reset.
    win.closed = false;
    expect(isBeaconAuthWindow(win as unknown as MessageEventSource)).toBe(false);
  });
});

describe("openTowerAppPath navigation confinement", () => {
  it("opens a blank window synchronously, then navigates it only to the Tower origin", async () => {
    const win = makeFakeWindow();
    windowOpen.mockReturnValueOnce(win);
    openTowerAppPath("/pricing", { popup: true });

    expect(windowOpen).toHaveBeenCalledWith("about:blank", "tower-app", expect.any(String));
    await flushAsync();
    expect(win.location.replace).toHaveBeenCalledTimes(1);
    const target = win.location.replace.mock.calls[0]?.[0] as string;
    expect(new URL(target).origin).toBe(TOWER_ORIGIN);
    expect(target).toBe(`${TOWER_ORIGIN}/pricing`);
  });

  it("is a no-op when the popup is blocked (window.open returns null)", () => {
    windowOpen.mockReturnValueOnce(null);
    expect(() => openTowerAppPath("/pricing", { popup: true })).not.toThrow();
  });
});

describe("openWebflowOAuthAuthorize destination allowlist", () => {
  function mockAuthorizeResponse(body: unknown, ok = true, status = 200): void {
    mockedTowerFetch.mockResolvedValueOnce({
      ok,
      status,
      json: async () => body,
    } as unknown as Response);
  }

  it("navigates the popup when Tower returns the Webflow consent URL", async () => {
    const win = makeFakeWindow();
    windowOpen.mockReturnValueOnce(win);
    mockAuthorizeResponse({ url: "https://webflow.com/oauth/authorize?state=abc" });

    const result = await openWebflowOAuthAuthorize();
    expect(result).toEqual({ ok: true });
    expect(win.location.replace).toHaveBeenCalledWith("https://webflow.com/oauth/authorize?state=abc");
    expect(win.close).not.toHaveBeenCalled();
  });

  it("closes the popup without navigating when the URL is not webflow.com", async () => {
    const win = makeFakeWindow();
    windowOpen.mockReturnValueOnce(win);
    mockAuthorizeResponse({ url: "https://evil.example/oauth/authorize" });

    const result = await openWebflowOAuthAuthorize();
    expect(result).toEqual({ ok: false, error: "invalid_authorize_url" });
    expect(win.location.replace).not.toHaveBeenCalled();
    expect(win.close).toHaveBeenCalled();
  });

  it("rejects a non-https scheme even on the right host and path", async () => {
    const win = makeFakeWindow();
    windowOpen.mockReturnValueOnce(win);
    mockAuthorizeResponse({ url: "http://webflow.com/oauth/authorize" });

    const result = await openWebflowOAuthAuthorize();
    expect(result).toEqual({ ok: false, error: "invalid_authorize_url" });
    expect(win.location.replace).not.toHaveBeenCalled();
  });

  it("rejects a webflow.com URL on a different path", async () => {
    const win = makeFakeWindow();
    windowOpen.mockReturnValueOnce(win);
    mockAuthorizeResponse({ url: "https://webflow.com/dashboard" });

    const result = await openWebflowOAuthAuthorize();
    expect(result).toEqual({ ok: false, error: "invalid_authorize_url" });
    expect(win.location.replace).not.toHaveBeenCalled();
  });

  it("resolves popup_blocked when the browser blocks the window", async () => {
    windowOpen.mockReturnValueOnce(null);
    const result = await openWebflowOAuthAuthorize();
    expect(result).toEqual({ ok: false, error: "popup_blocked" });
  });

  it("closes the popup when Tower is unreachable", async () => {
    const win = makeFakeWindow();
    windowOpen.mockReturnValueOnce(win);
    mockedTowerFetch.mockRejectedValueOnce(new Error("network down"));

    const result = await openWebflowOAuthAuthorize();
    expect(result).toEqual({ ok: false, error: "tower_unreachable" });
    expect(win.close).toHaveBeenCalled();
  });
});

describe("handleTowerMessage guard chain", () => {
  const VALID_DATA = { status: "success", type: "codalyn:tower-auth", token: "tok-123" };

  function makeEvent(overrides: { origin?: string; source?: unknown; data?: unknown } = {}): MessageEvent {
    return {
      origin: overrides.origin ?? TOWER_ORIGIN,
      source: "source" in overrides ? overrides.source : null,
      data: "data" in overrides ? overrides.data : VALID_DATA,
    } as MessageEvent;
  }

  it("ingests the token only for a registered auth window at the exact Tower origin", () => {
    const win = openRegisteredAuthWindow();
    const onSessionChanged = vi.fn();

    handleTowerMessage(makeEvent({ source: win }), TOWER_ORIGIN, onSessionChanged);

    expect(readBeaconTowerSessionToken()).toBe("tok-123");
    expect(onSessionChanged).toHaveBeenCalledTimes(1);
  });

  it("rejects a foreign origin even when the source is a registered auth window", () => {
    const win = openRegisteredAuthWindow();
    const onSessionChanged = vi.fn();

    handleTowerMessage(makeEvent({ origin: "https://evil.example", source: win }), TOWER_ORIGIN, onSessionChanged);

    expect(readBeaconTowerSessionToken()).toBeUndefined();
    expect(onSessionChanged).not.toHaveBeenCalled();
  });

  it("rejects a Tower-origin message whose source is not a window this app opened", () => {
    const stranger = { name: "stranger" } as unknown as Window;
    const onSessionChanged = vi.fn();

    handleTowerMessage(makeEvent({ source: stranger }), TOWER_ORIGIN, onSessionChanged);

    expect(readBeaconTowerSessionToken()).toBeUndefined();
    expect(onSessionChanged).not.toHaveBeenCalled();
  });

  it("rejects a registered source once its window has closed", () => {
    const win = openRegisteredAuthWindow();
    win.closed = true;
    const onSessionChanged = vi.fn();

    handleTowerMessage(makeEvent({ source: win }), TOWER_ORIGIN, onSessionChanged);

    expect(readBeaconTowerSessionToken()).toBeUndefined();
    expect(onSessionChanged).not.toHaveBeenCalled();
  });

  it("rejects a malformed message shape from a registered window", () => {
    const win = openRegisteredAuthWindow();
    const onSessionChanged = vi.fn();

    for (const data of [
      null,
      {},
      { status: "success", type: "wrong-type", token: "tok-123" },
      { status: "error", type: "codalyn:tower-auth", token: "tok-123" },
    ]) {
      handleTowerMessage(makeEvent({ source: win, data }), TOWER_ORIGIN, onSessionChanged);
    }

    expect(readBeaconTowerSessionToken()).toBeUndefined();
    expect(onSessionChanged).not.toHaveBeenCalled();
  });

  it("accepts a valid message but does not persist a non-string token", () => {
    const win = openRegisteredAuthWindow();
    const onSessionChanged = vi.fn();

    handleTowerMessage(
      makeEvent({ source: win, data: { status: "success", type: "codalyn:tower-auth", token: 42 } }),
      TOWER_ORIGIN,
      onSessionChanged
    );

    expect(readBeaconTowerSessionToken()).toBeUndefined();
    expect(onSessionChanged).toHaveBeenCalledTimes(1);
  });
});
