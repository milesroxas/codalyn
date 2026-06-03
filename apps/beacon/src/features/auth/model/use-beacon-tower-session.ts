import { useCallback, useEffect } from "react";
import {
  beginBeaconTowerSignOut,
  invalidateBeaconTowerSignOut,
  isBeaconTowerSignOutCurrent,
} from "@/features/auth/lib/beacon-tower-sign-out-coordination";
import {
  clearBeaconTowerSessionToken,
  exchangeWebflowDesignerSession,
  readBeaconTowerSessionToken,
  readSuppressDesignerSessionExchange,
  setSuppressDesignerSessionExchange,
  writeBeaconTowerSessionToken,
} from "@/features/auth/lib/webflow-designer-session";
import { getTowerAuthBaseUrl, towerAuthClient } from "@/features/auth/model/tower-auth-client";

/** Single-flighted across all hook instances so multiple mounted consumers don't fire duplicate exchanges. */
let designerExchangeInFlight = false;
/** Once an exchange fails, stop the focus/visibility auto-retry from hammering Tower until an explicit sign-in. */
let designerExchangeBlockedAfterFailure = false;

export type BridgedTowerUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

function persistTowerSessionToken(token: unknown): void {
  if (typeof token !== "string" || token.length === 0) {
    return;
  }
  writeBeaconTowerSessionToken(token);
}

function handleTowerMessage(event: MessageEvent, towerOrigin: string, onSessionChanged: () => void): void {
  if (!towerOrigin.trim()) {
    return;
  }
  if (event.origin !== towerOrigin) {
    return;
  }
  const data = event.data as Record<string, unknown> | null;
  if (!data || data.status !== "success") {
    return;
  }
  if (data.type !== "codalyn:tower-auth") {
    return;
  }
  // A new session arrived: cancel any in-flight sign-out so its late token clear / refetch does not clobber it.
  invalidateBeaconTowerSignOut();
  persistTowerSessionToken(data.token);
  setSuppressDesignerSessionExchange(false);
  onSessionChanged();
}

function toBridgedTowerUser(sessionData: unknown): BridgedTowerUser | undefined {
  const s = sessionData as
    | {
        user?: {
          id?: unknown;
          email?: unknown;
          name?: string | null;
          image?: string | null;
        };
        session?: { userId?: unknown };
      }
    | undefined;
  const u = s?.user;
  const email = typeof u?.email === "string" ? u.email : "";
  if (!email || !u) {
    return undefined;
  }
  const idFromUser = typeof u.id === "string" && u.id.trim() ? u.id.trim() : "";
  const idFromSession = typeof s.session?.userId === "string" && s.session.userId.trim() ? s.session.userId.trim() : "";
  return {
    id: idFromUser || idFromSession,
    email,
    name: u.name ?? null,
    image: u.image ?? null,
  };
}

/**
 * Tower session via Better Auth. Session is optional: guest mode works without signing in.
 */
export function useBeaconTowerSession(): {
  user: BridgedTowerUser | undefined;
  isPending: boolean;
  refetch: () => Promise<void>;
  clearStoredSession: () => void;
  signInWithDesignerSession: () => Promise<{ ok: true } | { ok: false; error: string }>;
} {
  const { data: session, isPending, refetch } = towerAuthClient.useSession();
  const hasStoredSessionToken = Boolean(readBeaconTowerSessionToken());

  const clearStoredSession = useCallback(() => {
    setSuppressDesignerSessionExchange(true);
    const epoch = beginBeaconTowerSignOut();
    // Keep the token until signOut resolves (the bearer plugin needs `Authorization` to resolve the session),
    // then clear it and refetch — unless a newer sign-in arrived meanwhile and invalidated this sign-out.
    void towerAuthClient.signOut({ fetchOptions: { credentials: "include" } }).then(() => {
      if (!isBeaconTowerSignOutCurrent(epoch)) {
        return;
      }
      clearBeaconTowerSessionToken();
      void refetch();
    });
  }, [refetch]);

  const towerOrigin = getTowerAuthBaseUrl();

  /**
   * Explicit, inline sign-in for the Designer extension: re-enable the silent exchange (in case the user had
   * signed out), cancel any in-flight sign-out, then mint a Tower bearer from the Webflow ID token. No popup.
   */
  const signInWithDesignerSession = useCallback(async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    invalidateBeaconTowerSignOut();
    setSuppressDesignerSessionExchange(false);
    designerExchangeBlockedAfterFailure = false;
    const result = await exchangeWebflowDesignerSession();
    if (result.ok) {
      await refetch();
    } else {
      designerExchangeBlockedAfterFailure = true;
    }
    return result;
  }, [refetch]);

  /**
   * Re-issue Tower bearer from the Webflow Designer ID token (Tower stores OAuth; Beacon persists bearer in
   * localStorage). Runs on mount and whenever the Designer regains focus so that completing sign-in elsewhere
   * (e.g. requesting access or verifying email in another tab) is picked up when the user returns.
   */
  useEffect(() => {
    if (!towerOrigin) {
      return;
    }
    let cancelled = false;
    const attemptExchange = () => {
      if (cancelled || designerExchangeInFlight || designerExchangeBlockedAfterFailure) {
        return;
      }
      if (readBeaconTowerSessionToken() || readSuppressDesignerSessionExchange()) {
        return;
      }
      designerExchangeInFlight = true;
      void exchangeWebflowDesignerSession()
        .then((r) => {
          if (r.ok) {
            if (!cancelled) {
              void refetch();
            }
          } else {
            designerExchangeBlockedAfterFailure = true;
          }
        })
        .catch(() => {
          designerExchangeBlockedAfterFailure = true;
        })
        .finally(() => {
          designerExchangeInFlight = false;
        });
    };
    attemptExchange();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        attemptExchange();
      }
    };
    window.addEventListener("focus", attemptExchange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", attemptExchange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refetch, towerOrigin]);

  useEffect(() => {
    if (!towerOrigin.trim()) {
      return;
    }
    function onMessage(ev: MessageEvent) {
      handleTowerMessage(ev, towerOrigin, () => {
        void refetch();
      });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refetch, towerOrigin]);

  const user = toBridgedTowerUser(session);

  useEffect(() => {
    if (isPending || !hasStoredSessionToken || user) {
      return;
    }
    clearBeaconTowerSessionToken();
    setSuppressDesignerSessionExchange(true);
  }, [isPending, hasStoredSessionToken, user]);

  return {
    user,
    isPending: hasStoredSessionToken ? isPending : false,
    refetch,
    clearStoredSession,
    signInWithDesignerSession,
  };
}
