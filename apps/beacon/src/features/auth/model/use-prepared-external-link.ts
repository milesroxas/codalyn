import { useCallback, useEffect, useRef, useState } from "react";
import { type ExternalAnchorProps, externalAnchorProps } from "@/features/auth/lib/tower-app-link";

export type PreparedExternalLinkState =
  /** Nothing requested yet: the control is a button that mints the destination on the user's click. */
  | { kind: "idle" }
  /** The destination is being minted by Tower (after the click). */
  | { kind: "preparing" }
  /** Minted: the control is a plain new-tab anchor to `url`. */
  | { kind: "ready"; url: string; preparedAt: number }
  /** Tower declined or could not be reached; the control offers a retry. */
  | { kind: "error"; error: string };

export type PrepareExternalLinkResult = { ok: true; url: string } | { ok: false; error: string };

export type PreparedExternalLinkAnchorProps = ExternalAnchorProps & {
  onPointerEnter: () => void;
  onFocus: () => void;
  onClick: () => void;
};

export type PreparedExternalLink = {
  state: PreparedExternalLinkState;
  /** The explicit user action that mints the destination. Ignored while a mint is in flight. */
  prepare: () => void;
  /** Anchor props for the minted destination; present only while `state.kind === "ready"`. */
  linkProps: PreparedExternalLinkAnchorProps | null;
};

/** Delay after the click before the opened destination is forgotten: the navigation in progress owns it. */
const FORGET_AFTER_OPEN_MS = 1_500;

/**
 * A new-tab link whose destination Tower has to mint first — a single-use OAuth `state` behind the
 * Webflow consent screen, a single-use session-handoff token behind a Tower page.
 *
 * Nothing is requested on mount. The user's explicit click on the idle control mints the destination
 * (that request is the state-changing action, so it follows the click, not the render), the minted
 * destination then opens as an ordinary `<a target="_blank">` navigation — the extension spawns no
 * windows — and once it is stale or has been opened the control returns to idle instead of re-minting
 * behind the user's back. Marketplace guidelines, "User interaction": every state-changing action is
 * traceable to a direct user interaction event, never fired on load; review round 9 (2026-09-28)
 * asked for exactly this for the consent link.
 */
export function usePreparedExternalLink(
  prepareUrl: () => Promise<PrepareExternalLinkResult>,
  options: {
    /** Age after which a minted destination is treated as expired and the control returns to idle. */
    staleMs: number;
    /** Runs when the user opens the minted destination (the anchor click). */
    onOpen?: () => void;
  }
): PreparedExternalLink {
  const [state, setState] = useState<PreparedExternalLinkState>({ kind: "idle" });
  const inflightRef = useRef(false);
  const mountedRef = useRef(false);
  const forgetTimerRef = useRef<number | null>(null);
  const prepareUrlRef = useRef(prepareUrl);
  prepareUrlRef.current = prepareUrl;
  const onOpenRef = useRef(options.onOpen);
  onOpenRef.current = options.onOpen;
  const { staleMs } = options;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (forgetTimerRef.current !== null) {
        window.clearTimeout(forgetTimerRef.current);
        forgetTimerRef.current = null;
      }
    };
  }, []);

  const prepare = useCallback(() => {
    if (inflightRef.current) {
      return;
    }
    inflightRef.current = true;
    setState({ kind: "preparing" });
    void prepareUrlRef.current().then((result) => {
      inflightRef.current = false;
      if (!mountedRef.current) {
        return;
      }
      setState(
        result.ok ? { kind: "ready", url: result.url, preparedAt: Date.now() } : { kind: "error", error: result.error }
      );
    });
  }, []);

  // A stale destination is not re-minted on hover or focus (that would be a request the user did not
  // ask for); the control simply becomes the idle button again, and the next click mints afresh.
  const ensureCurrent = useCallback(() => {
    setState((prev) => (prev.kind === "ready" && Date.now() - prev.preparedAt >= staleMs ? { kind: "idle" } : prev));
  }, [staleMs]);

  const onClick = useCallback(() => {
    onOpenRef.current?.();
    if (forgetTimerRef.current !== null) {
      window.clearTimeout(forgetTimerRef.current);
    }
    forgetTimerRef.current = window.setTimeout(() => {
      forgetTimerRef.current = null;
      // The navigation consumed the single-use destination; a second open needs a new explicit click.
      setState((prev) => (prev.kind === "ready" ? { kind: "idle" } : prev));
    }, FORGET_AFTER_OPEN_MS);
  }, []);

  const linkProps =
    state.kind === "ready"
      ? { ...externalAnchorProps(state.url), onPointerEnter: ensureCurrent, onFocus: ensureCurrent, onClick }
      : null;

  return { state, prepare, linkProps };
}
