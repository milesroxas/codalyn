import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ExternalAnchorProps,
  externalAnchorProps,
  isWebflowAuthorizeUrlStale,
} from "@/features/auth/lib/tower-app-link";
import { mintWebflowAuthorizeUrl } from "@/features/auth/model/tower-auth-client";

export type WebflowAuthorizeLinkState =
  | { kind: "minting" }
  | { kind: "ready"; url: string; mintedAt: number }
  | { kind: "error"; error: string };

export type WebflowAuthorizeAnchorProps = ExternalAnchorProps & {
  onPointerEnter: () => void;
  onFocus: () => void;
  onClick: () => void;
};

/** How often Tower state is re-read while the user is on Webflow's consent screen. */
const GRANT_POLL_INTERVAL_MS = 3_000;
/**
 * An abandoned consent tab must not keep a polling timer alive for the rest of the Designer session —
 * Marketplace guidance bars long-running background work. Same bound the old popup watcher had.
 */
const GRANT_POLL_TIMEOUT_MS = 10 * 60 * 1000;
/** Delay before re-minting after a click: the consent flow now in progress owns the previous state. */
const REMINT_AFTER_CLICK_MS = 1_500;

/**
 * Drives the Webflow OAuth consent link for the current site. The consent screen opens as an ordinary
 * `<a target="_blank">` navigation (never `window.open`), so the authorize URL — which carries a
 * single-use OAuth `state` bound server-side to the user/workspace — is minted when the gate mounts,
 * re-minted on hover/focus once stale, and re-minted after a click.
 *
 * Grant completion can no longer be observed through a window handle, so after the click the hook
 * re-reads Tower state (`onGrantCheck`) on a bounded interval and whenever the Designer tab becomes
 * visible again; the surrounding guard unmounts this once the site is authorized.
 */
export function useWebflowAuthorizeLink(onGrantCheck: () => void): {
  state: WebflowAuthorizeLinkState;
  linkProps: WebflowAuthorizeAnchorProps | null;
  retry: () => void;
} {
  const [state, setState] = useState<WebflowAuthorizeLinkState>({ kind: "minting" });
  const inflightRef = useRef(false);
  const mountedRef = useRef(false);
  const pollRef = useRef<number | null>(null);
  const remintTimerRef = useRef<number | null>(null);
  const onGrantCheckRef = useRef(onGrantCheck);
  onGrantCheckRef.current = onGrantCheck;

  const mint = useCallback((opts: { keepReadyOnFailure: boolean }) => {
    if (inflightRef.current) {
      return;
    }
    inflightRef.current = true;
    if (!opts.keepReadyOnFailure) {
      setState({ kind: "minting" });
    }
    void mintWebflowAuthorizeUrl().then((result) => {
      inflightRef.current = false;
      if (!mountedRef.current) {
        return;
      }
      if (result.ok) {
        setState({ kind: "ready", url: result.url, mintedAt: Date.now() });
        return;
      }
      setState((prev) =>
        opts.keepReadyOnFailure && prev.kind === "ready" ? prev : { kind: "error", error: result.error }
      );
    });
  }, []);

  const stopGrantWatch = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    mint({ keepReadyOnFailure: false });
    return () => {
      mountedRef.current = false;
      stopGrantWatch();
      if (remintTimerRef.current !== null) {
        window.clearTimeout(remintTimerRef.current);
        remintTimerRef.current = null;
      }
    };
  }, [mint, stopGrantWatch]);

  const startGrantWatch = useCallback(() => {
    stopGrantWatch();
    const startedAt = Date.now();
    pollRef.current = window.setInterval(() => {
      if (Date.now() - startedAt >= GRANT_POLL_TIMEOUT_MS) {
        stopGrantWatch();
        return;
      }
      onGrantCheckRef.current();
    }, GRANT_POLL_INTERVAL_MS);
  }, [stopGrantWatch]);

  // Returning to the Designer tab after approving on webflow.com: check immediately, don't wait a tick.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && pollRef.current !== null) {
        onGrantCheckRef.current();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const ensureFresh = useCallback(() => {
    if (state.kind === "ready" && isWebflowAuthorizeUrlStale(state.mintedAt, Date.now())) {
      mint({ keepReadyOnFailure: true });
    }
  }, [state, mint]);

  const onClick = useCallback(() => {
    startGrantWatch();
    if (remintTimerRef.current !== null) {
      window.clearTimeout(remintTimerRef.current);
    }
    remintTimerRef.current = window.setTimeout(() => {
      remintTimerRef.current = null;
      mint({ keepReadyOnFailure: true });
    }, REMINT_AFTER_CLICK_MS);
  }, [mint, startGrantWatch]);

  const retry = useCallback(() => mint({ keepReadyOnFailure: false }), [mint]);

  const linkProps =
    state.kind === "ready"
      ? { ...externalAnchorProps(state.url), onPointerEnter: ensureFresh, onFocus: ensureFresh, onClick }
      : null;

  return { state, linkProps, retry };
}
