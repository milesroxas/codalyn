import { readBeaconTowerOrigin } from "@/shared/lib/beacon-tower-origin";

export function isTowerNetworkFetchError(error: unknown): boolean {
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
  if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
    return `Could not reach Tower at ${origin}. From the Webflow Designer, local HTTP Tower is often blocked — use an HTTPS tunnel or the production Tower URL in VITE_TOWER_ORIGIN, and confirm Tower is running.`;
  }

  return origin
    ? `Could not reach Tower at ${origin}. Check your network connection and try again.`
    : "Could not reach Tower. Check VITE_TOWER_ORIGIN and your network connection.";
}
