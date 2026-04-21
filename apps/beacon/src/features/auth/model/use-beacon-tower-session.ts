import { useCallback, useEffect } from "react";
import {
  clearBeaconTowerSessionToken,
  exchangeWebflowDesignerSession,
  readBeaconTowerSessionToken,
  writeBeaconTowerSessionToken,
} from "@/features/auth/lib/webflow-designer-session";
import { getTowerAuthBaseUrl, towerAuthClient } from "@/features/auth/model/tower-auth-client";

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
  if (towerOrigin && event.origin !== towerOrigin) {
    return;
  }
  const data = event.data as Record<string, unknown> | null;
  if (!data || data.status !== "success") {
    return;
  }
  if (data.type !== "codalyn:tower-auth") {
    return;
  }
  persistTowerSessionToken(data.token);
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
} {
  const { data: session, isPending, refetch } = towerAuthClient.useSession();
  const hasStoredSessionToken = Boolean(readBeaconTowerSessionToken());

  const clearStoredSession = useCallback(() => {
    clearBeaconTowerSessionToken();
    void towerAuthClient.signOut({ fetchOptions: { credentials: "include" } }).then(() => refetch());
  }, [refetch]);

  const towerOrigin = getTowerAuthBaseUrl();

  /** Re-issue Tower bearer from Webflow Designer ID token (Tower stores OAuth; Beacon persists bearer in localStorage). */
  useEffect(() => {
    if (!towerOrigin) {
      return;
    }
    if (readBeaconTowerSessionToken()) {
      return;
    }
    let cancelled = false;
    void exchangeWebflowDesignerSession().then((r) => {
      if (!cancelled && r.ok) {
        void refetch();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refetch, towerOrigin]);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      handleTowerMessage(ev, towerOrigin, () => {
        void refetch();
      });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refetch, towerOrigin]);

  const user = toBridgedTowerUser(session);

  return {
    user,
    isPending: hasStoredSessionToken ? isPending : false,
    refetch,
    clearStoredSession,
  };
}
