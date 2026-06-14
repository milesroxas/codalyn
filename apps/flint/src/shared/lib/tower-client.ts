import { readFlintTowerSessionToken } from "@/features/auth/lib/flint-tower-session-token";
import { readFlintTowerOrigin } from "@/shared/lib/flint-tower-origin";

const flintApiKey = import.meta.env.VITE_FLINT_API_KEY ?? "";

/** Base URL for Tower (e.g. `http://localhost:3100` when using Docker Compose). */
export function getTowerOrigin(): string {
  return readFlintTowerOrigin();
}

/**
 * `fetch` to Tower with the Better Auth bearer (Designer session) or, in dev, the
 * `VITE_FLINT_API_KEY` fallback. Webflow OAuth access tokens live only on Tower;
 * this client never persists them.
 */
export function towerFetch(path: string, init?: RequestInit): Promise<Response> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const origin = readFlintTowerOrigin();
  const url = origin ? `${origin}${normalized}` : normalized;
  const headers = new Headers(init?.headers);
  const sessionToken = readFlintTowerSessionToken();
  if (sessionToken) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  } else if (flintApiKey) {
    headers.set("Authorization", `Bearer ${flintApiKey}`);
  }
  return fetch(url, {
    ...init,
    cache: init?.cache ?? "no-store",
    headers,
    credentials: init?.credentials ?? "include",
  });
}
