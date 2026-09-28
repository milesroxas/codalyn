// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeBeaconTowerSessionToken } from "@/features/auth/lib/beacon-tower-session-token";

const exchangeMock = vi.fn<(intent: "restore" | "sign_in") => Promise<{ ok: true } | { ok: false; error: string }>>();
vi.mock("@/features/auth/lib/webflow-designer-session", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/features/auth/lib/webflow-designer-session")>();
  return {
    ...original,
    exchangeWebflowDesignerSession: (intent: "restore" | "sign_in") => exchangeMock(intent),
  };
});

const SESSION = { user: { id: "u1", email: "designer@example.test", name: "D" }, session: { id: "s1", userId: "u1" } };
const sessionState: { data: typeof SESSION | null; isPending: boolean; errorStatus: number | null } = {
  data: null,
  isPending: false,
  errorStatus: null,
};
const refetchMock = vi.fn(async () => {
  sessionState.data = SESSION;
});
vi.mock("@/features/auth/model/tower-session-client", () => ({
  useTowerSession: () => ({ ...sessionState, refetch: refetchMock }),
  requestTowerSignOut: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/features/auth/model/tower-auth-client", () => ({
  getTowerAuthBaseUrl: () => "https://tower.example.test",
  isTowerConfigured: () => true,
}));

const SUPPRESS_KEY = "codalyn:beacon-tower-suppress-designer-exchange";

/** Fresh module state per test: the hook keeps single-flight and after-failure flags at module scope. */
async function loadHook() {
  vi.resetModules();
  const mod = await import("./use-beacon-tower-session");
  return mod.useBeaconTowerSession;
}

describe("useBeaconTowerSession — explicit Webflow sign-in", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionState.data = null;
    exchangeMock.mockReset();
    refetchMock.mockClear();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("runs the ID-token exchange on the click even though a sign-out suppressed the silent one", async () => {
    // A previous "Sign out" left the persistent suppression behind (or the stale-token reaper did).
    localStorage.setItem(SUPPRESS_KEY, "1");
    exchangeMock.mockImplementation(async () => {
      writeBeaconTowerSessionToken("bearer-1");
      return { ok: true };
    });
    const useBeaconTowerSession = await loadHook();
    const { result, rerender } = renderHook(() => useBeaconTowerSession());

    await waitFor(() => expect(result.current.isPending).toBe(false));
    // Silent path honoured the suppression: no exchange on mount, no user.
    expect(exchangeMock).not.toHaveBeenCalled();
    expect(result.current.user).toBeUndefined();

    let outcome: Awaited<ReturnType<typeof result.current.signInWithWebflow>> | undefined;
    await act(async () => {
      outcome = await result.current.signInWithWebflow();
    });
    rerender();

    expect(outcome).toEqual({ ok: true });
    expect(exchangeMock).toHaveBeenCalledTimes(1);
    // The click is the one place account creation / linking may happen.
    expect(exchangeMock).toHaveBeenCalledWith("sign_in");
    expect(refetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(SUPPRESS_KEY)).toBeNull();
    expect(result.current.user?.email).toBe(SESSION.user.email);
  });

  /**
   * Review round 9 (2026-09-28): the silent run on load only *restores* — Tower signs in the account
   * already associated with the Webflow user and creates or links nothing. "No account yet" is the
   * welcome screen, not a retry storm, and the explicit click then runs the full sign-in.
   */
  it("silent run is a restore: no account → welcome state after one attempt; the click then signs in", async () => {
    exchangeMock.mockImplementation(async (intent) => {
      if (intent === "restore") {
        return { ok: false, error: "no_tower_account" };
      }
      writeBeaconTowerSessionToken("bearer-2");
      return { ok: true };
    });
    const useBeaconTowerSession = await loadHook();
    const { result, rerender } = renderHook(() => useBeaconTowerSession());

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(exchangeMock).toHaveBeenCalledTimes(1);
    expect(exchangeMock).toHaveBeenCalledWith("restore");
    expect(result.current.user).toBeUndefined();
    expect(refetchMock).not.toHaveBeenCalled();

    // Focus / visibility do not re-run the refused restore.
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(exchangeMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.signInWithWebflow();
    });
    rerender();
    expect(exchangeMock).toHaveBeenCalledTimes(2);
    expect(exchangeMock).toHaveBeenLastCalledWith("sign_in");
    expect(refetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.user?.email).toBe(SESSION.user.email);
  });

  it("surfaces Tower's error code and does not refetch when the exchange is refused", async () => {
    exchangeMock.mockResolvedValue({ ok: false, error: "early_access_required" });
    const useBeaconTowerSession = await loadHook();
    const { result } = renderHook(() => useBeaconTowerSession());
    await waitFor(() => expect(result.current.isPending).toBe(false));
    // The silent run on mount already tried once and stopped on the permanent code.
    expect(exchangeMock).toHaveBeenCalledTimes(1);
    exchangeMock.mockClear();

    let outcome: Awaited<ReturnType<typeof result.current.signInWithWebflow>> | undefined;
    await act(async () => {
      outcome = await result.current.signInWithWebflow();
    });

    expect(outcome).toEqual({ ok: false, error: "early_access_required" });
    // Permanent failure: exactly one attempt, no retry ladder, nothing refetched.
    expect(exchangeMock).toHaveBeenCalledTimes(1);
    expect(refetchMock).not.toHaveBeenCalled();
    expect(result.current.user).toBeUndefined();
  });
});
