import { useCallback, useEffect } from "react";
import { signInToTowerWithEmail, type TowerEmailSignInResult } from "@/features/auth/lib/tower-email-sign-in";
import {
  clearFlintTowerSessionToken,
  exchangeWebflowDesignerSession,
  readFlintTowerSessionToken,
  readSuppressDesignerSessionExchange,
  setSuppressDesignerSessionExchange,
} from "@/features/auth/lib/webflow-designer-session";
import { getTowerAuthBaseUrl, towerAuthClient } from "@/features/auth/model/tower-auth-client";

/** Single-flighted across all hook instances so multiple mounted consumers don't duplicate the exchange. */
let designerExchangeInFlight = false;
/** Permanent auth failures stop silent auto-retry until an explicit sign-in clears this flag. */
let designerExchangeBlockedAfterFailure = false;

const DESIGNER_EXCHANGE_RETRY_DELAYS_MS = [0, 400, 1200] as const;

export type FlintTowerUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

function toFlintTowerUser(sessionData: unknown): FlintTowerUser | undefined {
  const s = sessionData as
    | {
        user?: { id?: unknown; email?: unknown; name?: string | null; image?: string | null };
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
  return { id: idFromUser || idFromSession, email, name: u.name ?? null, image: u.image ?? null };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function runSilentExchangeWithRetries(): Promise<{ ok: true } | { ok: false; error: string }> {
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
    // `tower_not_configured` / `get_id_token_failed` are not worth re-storming on focus.
    if (result.error === "tower_not_configured" || result.error === "get_id_token_failed") {
      return result;
    }
  }
  return { ok: false, error: lastError };
}

/**
 * Tower session via Better Auth. The session is OPTIONAL: Flint's free tier works
 * fully offline without ever signing in. When Tower is configured and the user
 * has a Designer session, a silent hybrid exchange establishes a Tower session.
 */
export function useFlintTowerSession(): {
  user: FlintTowerUser | undefined;
  isPending: boolean;
  refetch: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<TowerEmailSignInResult>;
  signOut: () => void;
} {
  const { data: session, isPending: authSessionPending, refetch } = towerAuthClient.useSession();
  const towerOrigin = getTowerAuthBaseUrl();
  const hasStoredSessionToken = Boolean(readFlintTowerSessionToken());

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<TowerEmailSignInResult> => {
      setSuppressDesignerSessionExchange(false);
      designerExchangeBlockedAfterFailure = false;
      // Gate the stale-token reaper (it checks this flag) until the post-sign-in refetch resolves, so it
      // doesn't clear the freshly stored token before the session populates.
      designerExchangeInFlight = true;
      try {
        const result = await signInToTowerWithEmail(email, password);
        if (result.ok) {
          await refetch();
        }
        return result;
      } finally {
        designerExchangeInFlight = false;
      }
    },
    [refetch]
  );

  const signOut = useCallback(() => {
    setSuppressDesignerSessionExchange(true);
    void towerAuthClient.signOut({ fetchOptions: { credentials: "include" } }).then(() => {
      clearFlintTowerSessionToken();
      void refetch();
    });
  }, [refetch]);

  // Silent exchange on mount + on window focus, when configured and not suppressed.
  useEffect(() => {
    if (!towerOrigin || readSuppressDesignerSessionExchange() || readFlintTowerSessionToken()) {
      return;
    }

    let cancelled = false;
    const attemptExchange = () => {
      if (cancelled || designerExchangeInFlight || designerExchangeBlockedAfterFailure) {
        return;
      }
      if (readFlintTowerSessionToken() || readSuppressDesignerSessionExchange()) {
        return;
      }
      designerExchangeInFlight = true;
      void runSilentExchangeWithRetries()
        .then(async (r) => {
          if (r.ok) {
            designerExchangeBlockedAfterFailure = false;
            if (!cancelled) {
              await refetch();
            }
          } else {
            designerExchangeBlockedAfterFailure = true;
          }
        })
        .catch(() => {
          /* transient — allow focus retries */
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

  const user = toFlintTowerUser(session);

  // Reap a stored token whose session never resolved (revoked/expired server-side).
  useEffect(() => {
    if (authSessionPending || designerExchangeInFlight || !hasStoredSessionToken || user) {
      return;
    }
    clearFlintTowerSessionToken();
    setSuppressDesignerSessionExchange(true);
  }, [authSessionPending, hasStoredSessionToken, user]);

  const isPending = hasStoredSessionToken ? authSessionPending : false;

  return { user, isPending, refetch, signInWithEmail, signOut };
}
