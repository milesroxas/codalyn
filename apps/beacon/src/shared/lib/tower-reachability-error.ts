import { readBeaconTowerOrigin } from "@/shared/lib/beacon-tower-origin";

/**
 * Dev-only guidance trigger: any non-HTTPS origin is mixed content inside the Designer iframe.
 * Checked by protocol so no development host strings ship in the production bundle.
 */
function isInsecureHttpOrigin(origin: string): boolean {
  try {
    return new URL(origin).protocol === "http:";
  } catch {
    return false;
  }
}

function isTowerNetworkFetchError(error: unknown): boolean {
  if (!(error instanceof TypeError)) {
    return false;
  }
  const message = error.message.trim().toLowerCase();
  return message === "failed to fetch" || message.includes("networkerror");
}

export function formatTowerReachabilityError(error: unknown): string {
  if (!isTowerNetworkFetchError(error)) {
    return error instanceof Error ? error.message : "Unexpected Tower request error";
  }

  const origin = readBeaconTowerOrigin();
  if (isInsecureHttpOrigin(origin)) {
    return `Could not reach Tower at ${origin}. From the Webflow Designer, plain-HTTP Tower origins are often blocked — use an HTTPS tunnel or the production Tower URL in VITE_TOWER_ORIGIN, and confirm Tower is running.`;
  }

  if (origin.includes("tower-preview.") || origin.includes("-preview.codalyn.app")) {
    return `Could not reach Tower at ${origin}. Preview Tower is usually behind Vercel Deployment Protection, which blocks Beacon API calls from the Webflow Designer (browser CORS errors on /api/auth/*). Add a Deployment Protection Exception for the preview domain in Vercel, or point VITE_TOWER_ORIGIN at https://tower.codalyn.app for production auth.`;
  }

  return origin
    ? `Could not reach Tower at ${origin}. Check your network connection and try again.`
    : "Could not reach Tower. Check VITE_TOWER_ORIGIN and your network connection.";
}
