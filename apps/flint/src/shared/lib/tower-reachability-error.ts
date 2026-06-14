import { readFlintTowerOrigin } from "@/shared/lib/flint-tower-origin";

function isTowerNetworkFetchError(error: unknown): boolean {
  if (!(error instanceof TypeError)) {
    return false;
  }
  const message = error.message.trim().toLowerCase();
  return message === "failed to fetch" || message.includes("networkerror");
}

/** Operator-facing diagnostic for a failed Tower request; never shown to end users verbatim. */
export function formatTowerReachabilityError(error: unknown): string {
  if (!isTowerNetworkFetchError(error)) {
    return error instanceof Error ? error.message : "Unexpected Tower request error";
  }

  const origin = readFlintTowerOrigin();
  if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
    return `Could not reach Tower at ${origin}. From the Webflow Designer, local HTTP Tower is often blocked — use an HTTPS tunnel or the production Tower URL in VITE_TOWER_ORIGIN, and confirm Tower is running.`;
  }

  if (origin.includes("tower-preview.") || origin.includes("-preview.codalyn.app")) {
    return `Could not reach Tower at ${origin}. Preview Tower is usually behind Vercel Deployment Protection, which blocks API calls from the Webflow Designer. Add a Deployment Protection Exception for the preview domain, or point VITE_TOWER_ORIGIN at production Tower.`;
  }

  return origin
    ? `Could not reach Tower at ${origin}. Check your network connection and try again.`
    : "Could not reach Tower. Check VITE_TOWER_ORIGIN and your network connection.";
}
