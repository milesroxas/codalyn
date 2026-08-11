import {
  BEACON_QUALITY_PARENT_SOURCE,
  BEACON_QUALITY_POPOUT_SOURCE,
  type QualityParentToPopoutMessage,
} from "@/features/image-editor/lib/quality-popout-protocol";

const POPOUT_NAME = "beacon-quality-compare";

/** Upper bound on the ready/close poll — an abandoned popout must not poll for the whole session. */
const POPOUT_READY_WATCH_TIMEOUT_MS = 10 * 60 * 1000;

/** Static compare page shipped in the extension bundle (public/quality-compare.html). */
export const QUALITY_COMPARE_POPOUT_PAGE = "quality-compare.html";

function clampExportQuality(q: number): number {
  return Math.min(1, Math.max(0.05, q));
}

/**
 * Opens the compression-compare popout as a static, same-origin page from the bundle — no blob-URL
 * document and no inline script, so it works under a strict CSP (Marketplace technical guidelines).
 * The page carries no data of its own: it posts `ready` once loaded and receives an `init` message
 * with the image Blobs (structured-cloned; the popout mints and revokes its own object URLs) and
 * initial settings.
 */
export function openQualityComparePopout(options: {
  originalBlob: Blob;
  compressedBlob: Blob;
  aspectRatio: number;
  initialQuality: number;
  targetOrigin: string;
}): Window | null {
  const { originalBlob, compressedBlob, aspectRatio, initialQuality, targetOrigin } = options;
  const ar = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const q0 = clampExportQuality(initialQuality);

  const popoutUrl = new URL(QUALITY_COMPARE_POPOUT_PAGE, window.location.href).toString();
  const popWin = window.open(popoutUrl, POPOUT_NAME, "popup=yes,width=1120,height=900,scrollbars=yes,resizable=yes");
  if (!popWin) {
    return null;
  }

  const initMessage: QualityParentToPopoutMessage = {
    source: BEACON_QUALITY_PARENT_SOURCE,
    type: "init",
    originalBlob,
    compressedBlob,
    aspectRatio: ar,
    initialQuality: q0,
  };

  const onReady = (event: MessageEvent) => {
    if (event.origin !== targetOrigin || event.source !== popWin) {
      return;
    }
    const d = event.data as { source?: unknown; type?: unknown } | null;
    if (!d || d.source !== BEACON_QUALITY_POPOUT_SOURCE || d.type !== "ready") {
      return;
    }
    window.removeEventListener("message", onReady);
    window.clearInterval(closeWatch);
    popWin.postMessage(initMessage, targetOrigin);
  };
  window.addEventListener("message", onReady);

  // Drop the ready listener if the popout is closed before it ever announces itself. Hard-bounded
  // like the auth popup watcher (Marketplace guidance bars long-running background work): a popout
  // that never loads and is left open must not keep this timer alive for the rest of the session.
  const startedAt = Date.now();
  const closeWatch = window.setInterval(() => {
    if (popWin.closed || Date.now() - startedAt >= POPOUT_READY_WATCH_TIMEOUT_MS) {
      window.clearInterval(closeWatch);
      window.removeEventListener("message", onReady);
    }
  }, 1000);

  popWin.focus();
  return popWin;
}
