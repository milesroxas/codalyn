import { readBeaconTowerSessionToken } from "@/features/auth/lib/webflow-designer-session";

const towerOrigin = import.meta.env.VITE_TOWER_ORIGIN?.replace(/\/$/, "") ?? "";
const beaconApiKey = import.meta.env.VITE_BEACON_API_KEY ?? "";

/** Base URL for Tower (e.g. `http://localhost:3100` when using Docker Compose). */
export function getTowerOrigin(): string {
  return towerOrigin;
}

/**
 * `fetch` to Tower with Better Auth bearer (Designer session) or optional dev `VITE_BEACON_API_KEY`.
 * Webflow OAuth access tokens are stored only on Tower; this client never persists them.
 */
export function towerFetch(path: string, init?: RequestInit): Promise<Response> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = towerOrigin ? `${towerOrigin}${normalized}` : normalized;
  const headers = new Headers(init?.headers);
  const sessionToken = readBeaconTowerSessionToken();
  if (sessionToken) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  } else if (beaconApiKey) {
    headers.set("Authorization", `Bearer ${beaconApiKey}`);
  }
  return fetch(url, {
    ...init,
    cache: init?.cache ?? "no-store",
    headers,
    credentials: init?.credentials ?? "include",
  });
}
