import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  readBeaconTowerDesignerExchangePhase,
  setBeaconTowerDesignerExchangePhase,
  subscribeBeaconTowerDesignerExchangePhase,
} from "@/features/auth/lib/beacon-tower-designer-exchange-phase";
import { isPermanentDesignerExchangeFailure } from "@/features/auth/lib/beacon-tower-designer-exchange-policy";
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
/** Permanent auth failures stop silent auto-retry until an explicit sign-in clears this flag. */
let designerExchangeBlockedAfterFailure = false;

const DESIGNER_EXCHANGE_RETRY_DELAYS_MS = [0, 400, 1200] as const;

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
  invalidateBeaconTowerSignOut();
  persistTowerSessionToken(data.token);
  setSuppressDesignerSessionExchange(false);
  designerExchangeBlockedAfterFailure = false;
  setBeaconTowerDesignerExchangePhase("settled");
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

function shouldAttemptSilentDesignerExchange(): boolean {
  return (
    Boolean(getTowerAuthBaseUrl()) &&
    !readBeaconTowerSessionToken() &&
    !readSuppressDesignerSessionExchange() &&
    !designerExchangeBlockedAfterFailure
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function runSilentDesignerExchangeWithRetries(): Promise<{ ok: true } | { ok: false; error: string }> {
  let lastError = "exchange_failed";
  for (let attempt = 0; attempt < DESIGNER_EXCHANGE_RETRY_DELAYS_MS.length; attempt += 1) {
    const delay = DESIGNER_EXCHANGE_RETRY_DELAYS_MS[attempt] ?? 0;
    if (delay > 0) {
      await sleep(delay);
    }
    const result = await exchangeWebflowDesignerSession();
    if (result.ok) {
      return result;
    }
    lastError = result.error;
    if (isPermanentDesignerExchangeFailure(result.error)) {
      return result;
    }
  }
  return { ok: false, error: lastError };
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
  const { data: session, isPending: authSessionPending, refetch } = towerAuthClient.useSession();
  const hasStoredSessionToken = Boolean(readBeaconTowerSessionToken());
  const suppressDesignerExchange = readSuppressDesignerSessionExchange();
  const designerExchangePhase = useSyncExternalStore(
    subscribeBeaconTowerDesignerExchangePhase,
    readBeaconTowerDesignerExchangePhase,
    readBeaconTowerDesignerExchangePhase
  );

  const clearStoredSession = useCallback(() => {
    setSuppressDesignerSessionExchange(true);
    setBeaconTowerDesignerExchangePhase("settled");
    const epoch = beginBeaconTowerSignOut();
    void towerAuthClient.signOut({ fetchOptions: { credentials: "include" } }).then(() => {
      if (!isBeaconTowerSignOutCurrent(epoch)) {
        return;
      }
      clearBeaconTowerSessionToken();
      void refetch();
    });
  }, [refetch]);

  const towerOrigin = getTowerAuthBaseUrl();

  const signInWithDesignerSession = useCallback(async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    invalidateBeaconTowerSignOut();
    setSuppressDesignerSessionExchange(false);
    designerExchangeBlockedAfterFailure = false;
    setBeaconTowerDesignerExchangePhase("running");
    const result = await runSilentDesignerExchangeWithRetries();
    setBeaconTowerDesignerExchangePhase("settled");
    if (result.ok) {
      await refetch();
    } else if (isPermanentDesignerExchangeFailure(result.error)) {
      designerExchangeBlockedAfterFailure = true;
    }
    return result;
  }, [refetch]);

  useEffect(() => {
    if (!towerOrigin) {
      setBeaconTowerDesignerExchangePhase("settled");
      return;
    }
    if (readSuppressDesignerSessionExchange()) {
      setBeaconTowerDesignerExchangePhase("settled");
      return;
    }
    if (readBeaconTowerSessionToken()) {
      setBeaconTowerDesignerExchangePhase("settled");
      return;
    }

    let cancelled = false;
    const attemptExchange = () => {
      if (cancelled || designerExchangeInFlight || designerExchangeBlockedAfterFailure) {
        return;
      }
      if (!shouldAttemptSilentDesignerExchange()) {
        setBeaconTowerDesignerExchangePhase("settled");
        return;
      }
      designerExchangeInFlight = true;
      setBeaconTowerDesignerExchangePhase("running");
      void runSilentDesignerExchangeWithRetries()
        .then((r) => {
          if (r.ok) {
            designerExchangeBlockedAfterFailure = false;
            if (!cancelled) {
              void refetch();
            }
          } else if (isPermanentDesignerExchangeFailure(r.error)) {
            designerExchangeBlockedAfterFailure = true;
          }
        })
        .catch(() => {
          /* transient — allow focus retries */
        })
        .finally(() => {
          designerExchangeInFlight = false;
          if (!cancelled) {
            setBeaconTowerDesignerExchangePhase("settled");
          }
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
    if (authSessionPending || !hasStoredSessionToken || user) {
      return;
    }
    clearBeaconTowerSessionToken();
    setSuppressDesignerSessionExchange(true);
    setBeaconTowerDesignerExchangePhase("settled");
  }, [authSessionPending, hasStoredSessionToken, user]);

  const bootstrapPending =
    Boolean(towerOrigin) && !hasStoredSessionToken && !suppressDesignerExchange && designerExchangePhase !== "settled";
  const isPending =
    (hasStoredSessionToken ? authSessionPending : false) || bootstrapPending || designerExchangePhase === "running";

  return {
    user,
    isPending,
    refetch,
    clearStoredSession,
    signInWithDesignerSession,
  };
}
