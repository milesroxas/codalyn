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
  type WebflowDesignerExchangeIntent,
} from "@/features/auth/lib/webflow-designer-session";
import { getTowerAuthBaseUrl } from "@/features/auth/model/tower-auth-client";
import { requestTowerSignOut, useTowerSession } from "@/features/auth/model/tower-session-client";

/** Single-flighted across all hook instances so multiple mounted consumers don't fire duplicate exchanges. */
let designerExchangeInFlight = false;
/** Permanent auth failures stop silent auto-retry until an explicit sign-in clears this flag. */
let designerExchangeBlockedAfterFailure = false;
/**
 * True while an explicit sign-in — inline email/password, or the "Continue with Webflow" click — is
 * writing its token and refetching. Guards the stale-token reaper (token is written before the session
 * resolves) WITHOUT flipping `isPending` — the login screen must stay mounted so its inline
 * error/spinner are not lost mid-submit.
 */
let explicitSignInInFlight = false;

const DESIGNER_EXCHANGE_RETRY_DELAYS_MS = [0, 400, 1200] as const;

export type WebflowSignInResult = { ok: true } | { ok: false; error: string };

export type BridgedTowerUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

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

async function runDesignerExchangeWithRetries(
  intent: WebflowDesignerExchangeIntent
): Promise<{ ok: true } | { ok: false; error: string }> {
  let lastError = "exchange_failed";
  for (let attempt = 0; attempt < DESIGNER_EXCHANGE_RETRY_DELAYS_MS.length; attempt += 1) {
    const delay = DESIGNER_EXCHANGE_RETRY_DELAYS_MS[attempt] ?? 0;
    if (delay > 0) {
      await sleep(delay);
    }
    const result = await exchangeWebflowDesignerSession(intent);
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
 * Tower session (Tower runs Better Auth; the extension reads it through its own first-party client).
 * Session is optional: guest mode works without signing in.
 */
export function useBeaconTowerSession(): {
  user: BridgedTowerUser | undefined;
  isPending: boolean;
  refetch: () => Promise<void>;
  clearStoredSession: () => void;
  signInWithEmail: (email: string, password: string) => Promise<TowerEmailSignInResult>;
  /** Explicit, user-initiated Designer ID-token exchange (the "Continue with Webflow" click). */
  signInWithWebflow: () => Promise<WebflowSignInResult>;
} {
  const { data: session, isPending: authSessionPending, refetch } = useTowerSession();
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
    // Clear the stored bearer even if Tower could not be reached for the sign-out. Otherwise the
    // in-memory token keeps getting attached to requests after the user signed out.
    void requestTowerSignOut().finally(() => {
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
      explicitSignInInFlight = true;
      try {
        const result = await signInToTowerWithEmail(email, password);
        if (result.ok) {
          await refetch();
        }
        return result;
      } finally {
        explicitSignInInFlight = false;
      }
    },
    [refetch]
  );

  /**
   * The documented hybrid-app sign-in (`webflow.getIdToken()` → Tower `token/resolve` → Tower session),
   * run on the user's click with intent `sign_in`: unlike the silent `restore` run on load it may link a
   * same-e-mail Tower account or create one, and it ignores the sign-out suppression and the after-failure
   * block — both exist only to stop *automatic* re-sign-in — and clears them, so a later silent run behaves
   * normally again. Never flips the exchange phase (that feeds `isPending` and would unmount the welcome
   * screen before its error could show); the reaper is held like an email sign-in.
   */
  const signInWithWebflow = useCallback(async (): Promise<WebflowSignInResult> => {
    if (!towerOrigin) {
      return { ok: false, error: "tower_not_configured" };
    }
    if (designerExchangeInFlight) {
      return { ok: false, error: "exchange_in_flight" };
    }
    invalidateBeaconTowerSignOut();
    setSuppressDesignerSessionExchange(false);
    designerExchangeBlockedAfterFailure = false;
    designerExchangeInFlight = true;
    explicitSignInInFlight = true;
    try {
      const result = await runDesignerExchangeWithRetries("sign_in");
      if (result.ok) {
        await refetch();
      } else {
        // Keep focus/visibility from re-running the same failing exchange; the next click clears this.
        designerExchangeBlockedAfterFailure = true;
      }
      return result;
    } finally {
      designerExchangeInFlight = false;
      explicitSignInInFlight = false;
    }
  }, [refetch, towerOrigin]);

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
      // Silent = restore only: Tower signs in the account already associated with this Webflow user and
      // creates or links nothing (`no_tower_account` lands the user on the welcome screen, whose
      // "Continue with Webflow" runs the `sign_in` intent on the click).
      void runDesignerExchangeWithRetries("restore")
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
            // lands in the welcome gate. An explicit sign-in ("Continue with Webflow" or email) clears
            // this flag.
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

  const user = toBridgedTowerUser(session);

  useEffect(() => {
    // Only reap a stored token once an exchange has settled: while it is "running" (designer exchange) or
    // an email sign-in is in flight, a fresh token is written before the session refetch completes, so
    // "token present, no user yet" is expected and must not be treated as stale (it would clobber sign-in).
    if (
      authSessionPending ||
      designerExchangePhase === "running" ||
      explicitSignInInFlight ||
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
    signInWithWebflow,
  };
}
