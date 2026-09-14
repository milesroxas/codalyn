import { useCallback, useEffect, useRef, useState } from "react";
import { readBeaconTowerSessionToken } from "@/features/auth/lib/beacon-tower-session-token";
import {
  type ExternalAnchorProps,
  externalAnchorProps,
  isTowerHandoffTokenStale,
  resolveTowerAppHref,
} from "@/features/auth/lib/tower-app-link";
import { getTowerAuthBaseUrl, mintTowerHandoffToken } from "@/features/auth/model/tower-auth-client";

export type TowerAppLinkProps = ExternalAnchorProps & {
  onPointerEnter: () => void;
  onFocus: () => void;
  onClick: () => void;
};

/** Delay before re-minting after a click: the navigation has consumed the token by then. */
const REMINT_AFTER_CLICK_MS = 1_000;

type MintedHandoff = { token: string; mintedAt: number };

/**
 * Anchor props for a Tower app route, opened as an ordinary new-tab link (never `window.open`).
 *
 * When the Designer session holds a Tower bearer, the `href` is the one-time-token handoff URL so
 * Tower establishes a first-party cookie session instead of bouncing to sign-in. Because an anchor's
 * destination must be known at click time, the single-use token is minted when the surface mounts,
 * re-minted on hover/focus once stale, and re-minted after a click (the navigation consumed it). With
 * no bearer — or while a mint is in flight / failed — the `href` is the plain route, which enforces
 * its own auth. Returns `null` when no Tower origin is configured for this build.
 */
export function useTowerAppLink(path: string): TowerAppLinkProps | null {
  const towerOrigin = getTowerAuthBaseUrl();
  const [handoff, setHandoff] = useState<MintedHandoff | null>(null);
  const inflightRef = useRef(false);
  const mountedRef = useRef(false);
  const remintTimerRef = useRef<number | null>(null);

  const mint = useCallback(() => {
    if (!towerOrigin || inflightRef.current || !readBeaconTowerSessionToken()) {
      return;
    }
    inflightRef.current = true;
    void mintTowerHandoffToken().then((token) => {
      inflightRef.current = false;
      if (!mountedRef.current) {
        return;
      }
      setHandoff(token ? { token, mintedAt: Date.now() } : null);
    });
  }, [towerOrigin]);

  useEffect(() => {
    mountedRef.current = true;
    mint();
    return () => {
      mountedRef.current = false;
      if (remintTimerRef.current !== null) {
        window.clearTimeout(remintTimerRef.current);
        remintTimerRef.current = null;
      }
    };
  }, [mint]);

  const ensureFresh = useCallback(() => {
    if (!handoff || isTowerHandoffTokenStale(handoff.mintedAt, Date.now())) {
      mint();
    }
  }, [handoff, mint]);

  const onClick = useCallback(() => {
    // The navigation now in progress consumes this token; a second click must not reuse it.
    setHandoff(null);
    if (remintTimerRef.current !== null) {
      window.clearTimeout(remintTimerRef.current);
    }
    remintTimerRef.current = window.setTimeout(() => {
      remintTimerRef.current = null;
      mint();
    }, REMINT_AFTER_CLICK_MS);
  }, [mint]);

  const href = resolveTowerAppHref({ towerOrigin, path, token: handoff?.token ?? null });
  if (!href) {
    return null;
  }
  return { ...externalAnchorProps(href), onPointerEnter: ensureFresh, onFocus: ensureFresh, onClick };
}
