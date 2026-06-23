import { useCallback, useEffect, useSyncExternalStore } from "react";
import { clearBeaconGuestChosen } from "@/features/auth/lib/beacon-guest-choice";
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
import { signInToTowerWithEmail, type TowerEmailSignInResult } from "@/features/auth/lib/tower-email-sign-in";
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
/**
 * True while an inline email/password sign-in is writing its token and refetching. Guards the stale-token
 * reaper (token is written before the session resolves) WITHOUT flipping `isPending` — the login form must
 * stay mounted so its inline error/spinner are not lost mid-submit.
 */
let emailSignInInFlight = false;

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
  if (data?.status !== "success") {
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
  signInWithEmail: (email: string, password: string) => Promise<TowerEmailSignInResult>;
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
    // Signing out resets the in-memory guest choice so the logged-out login gate returns even if
    // the user had earlier chosen "Continue as guest" in this same app load.
    clearBeaconGuestChosen();
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

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<TowerEmailSignInResult> => {
      invalidateBeaconTowerSignOut();
      setSuppressDesignerSessionExchange(false);
      designerExchangeBlockedAfterFailure = false;
      // Guard the reaper across the token write + refetch, but DON'T touch the exchange phase: that feeds
      // `isPending`, which would hide the login gate and unmount this form before its error could show.
      emailSignInInFlight = true;
      try {
        const result = await signInToTowerWithEmail(email, password);
        if (result.ok) {
          await refetch();
        }
        return result;
      } finally {
        emailSignInInFlight = false;
      }
    },
    [refetch]
  );

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
        .then(async (r) => {
          if (r.ok) {
            designerExchangeBlockedAfterFailure = false;
            if (!cancelled) {
              // Await the refetch so the phase only settles once `user` is populated; otherwise the
              // reaper effect would clear the just-written token before the session resolves.
              await refetch();
            }
          } else {
            // Exhausted the retry ladder (or hit a permanent failure). Stop further SILENT auto-retries
            // so focus/visibilitychange don't re-storm Tower with the same failing exchange; the user
            // lands in the guest gate. A manual "Sign in to Tower" or a successful Tower postMessage
            // (handleTowerMessage) clears this flag and re-enables sign-in.
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
    // Only reap a stored token once an exchange has settled: while it is "running" (designer exchange) or
    // an email sign-in is in flight, a fresh token is written before the session refetch completes, so
    // "token present, no user yet" is expected and must not be treated as stale (it would clobber sign-in).
    if (
      authSessionPending ||
      designerExchangePhase === "running" ||
      emailSignInInFlight ||
      !hasStoredSessionToken ||
      user
    ) {
      return;
    }
    clearBeaconTowerSessionToken();
    setSuppressDesignerSessionExchange(true);
    setBeaconTowerDesignerExchangePhase("settled");
  }, [authSessionPending, designerExchangePhase, hasStoredSessionToken, user]);

  const bootstrapPending =
    Boolean(towerOrigin) && !hasStoredSessionToken && !suppressDesignerExchange && designerExchangePhase !== "settled";
  const isPending =
    (hasStoredSessionToken ? authSessionPending : false) || bootstrapPending || designerExchangePhase === "running";

  return {
    user,
    isPending,
    refetch,
    clearStoredSession,
    signInWithEmail,
  };
}
