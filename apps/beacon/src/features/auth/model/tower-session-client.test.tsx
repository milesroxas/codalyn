// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const towerFetch = vi.fn<(path: string, init?: RequestInit) => Promise<Response>>();
vi.mock("@/shared/lib/tower-client", () => ({
  towerFetch: (path: string, init?: RequestInit) => towerFetch(path, init),
}));

import {
  normalizeTowerSessionPayload,
  refetchTowerSession,
  requestTowerEmailSignIn,
  requestTowerSignOut,
  resetTowerSessionStoreForTests,
  useTowerSession,
} from "./tower-session-client";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

const SESSION = {
  session: { id: "s1", userId: "u1", token: "t" },
  user: { id: "u1", email: "a@b.test", name: "A" },
};

describe("normalizeTowerSessionPayload (boundary)", () => {
  it("accepts the canonical { session, user } shape", () => {
    expect(normalizeTowerSessionPayload(SESSION)).toEqual(SESSION);
  });

  it("accepts a user without a session object (session read as null)", () => {
    expect(normalizeTowerSessionPayload({ user: SESSION.user })).toEqual({ user: SESSION.user, session: null });
    expect(normalizeTowerSessionPayload({ user: SESSION.user, session: "nope" })).toEqual({
      user: SESSION.user,
      session: null,
    });
  });

  it.each([
    null,
    undefined,
    "",
    "string",
    42,
    [],
    [SESSION],
    { session: null, user: null },
    { user: "a@b" },
  ])("reads %j as no session", (raw) => {
    expect(normalizeTowerSessionPayload(raw)).toBeNull();
  });
});

describe("session store", () => {
  beforeEach(() => {
    resetTowerSessionStoreForTests();
    towerFetch.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads GET /api/auth/get-session and settles pending", async () => {
    towerFetch.mockResolvedValueOnce(jsonResponse(SESSION));
    await refetchTowerSession();
    expect(towerFetch).toHaveBeenCalledWith("/api/auth/get-session", expect.objectContaining({ method: "GET" }));
    const { renderHook } = await import("@testing-library/react");
    const { result } = renderHook(() => useTowerSession());
    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toEqual(SESSION);
    expect(result.current.errorStatus).toBeNull();
  });

  it("starts the first read when the first consumer subscribes, once for all consumers", async () => {
    let resolveRead: (r: Response) => void = () => {};
    towerFetch.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveRead = resolve;
      })
    );
    const { renderHook, act, waitFor } = await import("@testing-library/react");
    const first = renderHook(() => useTowerSession());
    const second = renderHook(() => useTowerSession());
    expect(first.result.current.isPending).toBe(true);
    expect(second.result.current.isPending).toBe(true);
    expect(towerFetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveRead(jsonResponse(null));
    });
    await waitFor(() => expect(first.result.current.isPending).toBe(false));
    expect(first.result.current.data).toBeNull();
    expect(second.result.current.data).toBeNull();
  });

  it("clears the session on 401 but keeps known data on other failures", async () => {
    towerFetch.mockResolvedValueOnce(jsonResponse(SESSION));
    await refetchTowerSession();
    towerFetch.mockResolvedValueOnce(jsonResponse({ error: "boom" }, 503));
    await refetchTowerSession();
    const { renderHook } = await import("@testing-library/react");
    const kept = renderHook(() => useTowerSession());
    expect(kept.result.current.data).toEqual(SESSION);
    expect(kept.result.current.errorStatus).toBe(503);
    expect(kept.result.current.isPending).toBe(false);

    towerFetch.mockResolvedValueOnce(jsonResponse({ error: "unauthorized" }, 401));
    await refetchTowerSession();
    const cleared = renderHook(() => useTowerSession());
    expect(cleared.result.current.data).toBeNull();
    expect(cleared.result.current.errorStatus).toBe(401);
  });

  it("treats a network failure as settled with status 0 and never rejects", async () => {
    towerFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(refetchTowerSession()).resolves.toBeUndefined();
    const { renderHook } = await import("@testing-library/react");
    const { result } = renderHook(() => useTowerSession());
    expect(result.current.isPending).toBe(false);
    expect(result.current.errorStatus).toBe(0);
  });

  it("lets the latest read win when reads overlap", async () => {
    let resolveSlow: (r: Response) => void = () => {};
    towerFetch.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveSlow = resolve;
      })
    );
    const slow = refetchTowerSession();
    towerFetch.mockResolvedValueOnce(jsonResponse(SESSION));
    await refetchTowerSession();
    resolveSlow(jsonResponse(null));
    await slow;
    const { renderHook } = await import("@testing-library/react");
    const { result } = renderHook(() => useTowerSession());
    expect(result.current.data).toEqual(SESSION);
  });

  it("ignores a malformed body (array) as no session rather than a partial one", async () => {
    towerFetch.mockResolvedValueOnce(jsonResponse([SESSION]));
    await refetchTowerSession();
    const { renderHook } = await import("@testing-library/react");
    const { result } = renderHook(() => useTowerSession());
    expect(result.current.data).toBeNull();
    expect(result.current.errorStatus).toBeNull();
  });
});

describe("requestTowerEmailSignIn", () => {
  beforeEach(() => {
    towerFetch.mockReset();
  });

  it("POSTs JSON credentials and returns the body token", async () => {
    towerFetch.mockResolvedValueOnce(jsonResponse({ token: " tok-body ", user: SESSION.user }));
    await expect(requestTowerEmailSignIn("a@b.test", "pw")).resolves.toEqual({ ok: true, token: "tok-body" });
    const [path, init] = towerFetch.mock.calls[0] ?? [];
    expect(path).toBe("/api/auth/sign-in/email");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ email: "a@b.test", password: "pw" });
  });

  it("falls back to the set-auth-token header, and reports null when neither carries a token", async () => {
    towerFetch.mockResolvedValueOnce(jsonResponse({ user: SESSION.user }, 200, { "set-auth-token": "tok-header" }));
    await expect(requestTowerEmailSignIn("a@b.test", "pw")).resolves.toEqual({ ok: true, token: "tok-header" });
    towerFetch.mockResolvedValueOnce(jsonResponse({ user: SESSION.user }));
    await expect(requestTowerEmailSignIn("a@b.test", "pw")).resolves.toEqual({ ok: true, token: null });
  });

  it("reduces an error body to { code, message, status }", async () => {
    towerFetch.mockResolvedValueOnce(
      jsonResponse({ code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" }, 401)
    );
    await expect(requestTowerEmailSignIn("a@b.test", "pw")).resolves.toEqual({
      ok: false,
      error: { code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password", status: 401 },
    });
  });

  it("tolerates a non-JSON or malformed error body", async () => {
    towerFetch.mockResolvedValueOnce(new Response("<html>", { status: 502 }));
    await expect(requestTowerEmailSignIn("a@b.test", "pw")).resolves.toEqual({ ok: false, error: { status: 502 } });
    towerFetch.mockResolvedValueOnce(jsonResponse({ code: 7, message: null }, 400));
    await expect(requestTowerEmailSignIn("a@b.test", "pw")).resolves.toEqual({ ok: false, error: { status: 400 } });
  });

  it("reports a network failure as status 0", async () => {
    towerFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(requestTowerEmailSignIn("a@b.test", "pw")).resolves.toEqual({ ok: false, error: { status: 0 } });
  });
});

describe("requestTowerSignOut", () => {
  beforeEach(() => {
    towerFetch.mockReset();
  });

  it("POSTs /api/auth/sign-out and reports acknowledgement", async () => {
    towerFetch.mockResolvedValueOnce(jsonResponse({ success: true }));
    await expect(requestTowerSignOut()).resolves.toEqual({ ok: true });
    expect(towerFetch).toHaveBeenCalledWith("/api/auth/sign-out", expect.objectContaining({ method: "POST" }));
  });

  it("resolves (never rejects) when Tower is unreachable so the local token is still cleared", async () => {
    towerFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(requestTowerSignOut()).resolves.toEqual({ ok: false });
  });
});
