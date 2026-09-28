import { useCallback, useEffect, useRef } from "react";
import { WEBFLOW_AUTHORIZE_URL_STALE_MS } from "@/features/auth/lib/tower-app-link";
import { mintWebflowAuthorizeUrl } from "@/features/auth/model/tower-auth-client";
import {
  type PreparedExternalLinkAnchorProps,
  type PreparedExternalLinkState,
  usePreparedExternalLink,
} from "@/features/auth/model/use-prepared-external-link";

export type WebflowAuthorizeLinkState = PreparedExternalLinkState;
export type WebflowAuthorizeAnchorProps = PreparedExternalLinkAnchorProps;

/** How often Tower state is re-read while the user is on Webflow's consent screen. */
const GRANT_POLL_INTERVAL_MS = 3_000;
/**
 * An abandoned consent tab must not keep a polling timer alive for the rest of the Designer session —
 * Marketplace guidance bars long-running background work. Same bound the old popup watcher had.
 */
const GRANT_POLL_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Drives the Webflow OAuth consent link for the current site — a *new* authorization for a site outside
 * the workspace's existing grant, distinct from restoring a session (the ID-token exchange, which never
 * touches OAuth).
 *
 * Nothing is minted on mount. `connect` is the user's explicit action: it asks Tower for the authorize
 * URL (Tower stores the single-use OAuth `state` bound to the user and workspace server-side), the URL is
 * allowlisted to `https://webflow.com/oauth/authorize`, and the consent screen then opens as an ordinary
 * `<a target="_blank">` navigation (never `window.open`). A stale state returns the control to idle rather
 * than re-minting on hover (review round 9, 2026-09-28: "Prepare the Webflow authorization URL after a
 * user action … Move this preparation to an explicit Connect action").
 *
 * Grant completion cannot be observed through a window handle, so after the click the hook re-reads
 * Tower state (`onGrantCheck`) on a bounded interval and whenever the Designer tab becomes visible again;
 * the surrounding guard unmounts this once the site is authorized.
 */
export function useWebflowAuthorizeLink(onGrantCheck: () => void): {
  state: WebflowAuthorizeLinkState;
  linkProps: WebflowAuthorizeAnchorProps | null;
  connect: () => void;
} {
  const pollRef = useRef<number | null>(null);
  const onGrantCheckRef = useRef(onGrantCheck);
  onGrantCheckRef.current = onGrantCheck;

  const stopGrantWatch = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

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

  useEffect(() => stopGrantWatch, [stopGrantWatch]);

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

  const { state, prepare, linkProps } = usePreparedExternalLink(mintWebflowAuthorizeUrl, {
    staleMs: WEBFLOW_AUTHORIZE_URL_STALE_MS,
    onOpen: startGrantWatch,
  });

  return { state, linkProps, connect: prepare };
}
