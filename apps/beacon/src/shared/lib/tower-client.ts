import { readBeaconTowerSessionToken } from "@/features/auth/lib/webflow-designer-session";
import { readBeaconTowerOrigin } from "@/shared/lib/beacon-tower-origin";
import { extensionFetch } from "@/shared/lib/extension-egress";

const beaconApiKey = import.meta.env.VITE_BEACON_API_KEY ?? "";

/** Base URL for Tower (a local Tower on port 3100 under Docker Compose, tower.codalyn.app in release builds). */
export function getTowerOrigin(): string {
  return readBeaconTowerOrigin();
}

/**
 * Request to Tower with the Better Auth bearer (Designer session) or optional dev `VITE_BEACON_API_KEY`,
 * sent through the extension's single egress point (`extensionFetch`, Tower-origin policy).
 * Webflow OAuth access tokens are stored only on Tower; this client never persists them.
 */
export function towerFetch(path: string, init?: RequestInit): Promise<Response> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const origin = readBeaconTowerOrigin();
  const url = origin ? `${origin}${normalized}` : normalized;
  const headers = new Headers(init?.headers);
  const sessionToken = readBeaconTowerSessionToken();
  if (sessionToken) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  } else if (beaconApiKey) {
    headers.set("Authorization", `Bearer ${beaconApiKey}`);
  }
  return extensionFetch(url, {
    ...init,
    cache: init?.cache ?? "no-store",
    headers,
    credentials: init?.credentials ?? "include",
  });
}

const RATE_LIMIT_STATUS = 429;
const MAX_RATE_LIMIT_RETRIES = 4;

/**
 * Delay before re-issuing a rate-limited request. Honors the upstream `Retry-After` header (seconds or HTTP-date)
 * when present — Webflow sends it — and falls back to exponential backoff (500ms, 1s, 2s, 4s) otherwise.
 */
function rateLimitBackoffMs(res: Response, attempt: number): number {
  const header = res.headers.get("Retry-After");
  if (header) {
    const seconds = Number.parseInt(header, 10);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
    const dateMs = Date.parse(header);
    if (Number.isFinite(dateMs)) {
      return Math.max(0, dateMs - Date.now());
    }
  }
  return 500 * 2 ** attempt;
}

/**
 * {@link towerFetch} that transparently retries on HTTP 429 with `Retry-After`-aware backoff. Use for Webflow Data API
 * proxy calls, which are rate-limited (~60 req/min). Only retries 429; every other status (including the expected 404
 * for pages without a custom-code block) is returned to the caller unchanged. Bodies must be replayable (string/Blob/
 * ArrayBuffer, not a one-shot stream) since the same `init` is re-sent per attempt.
 */
export async function towerFetchWithRetry(path: string, init?: RequestInit): Promise<Response> {
  let res = await towerFetch(path, init);
  for (let attempt = 0; res.status === RATE_LIMIT_STATUS && attempt < MAX_RATE_LIMIT_RETRIES; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, rateLimitBackoffMs(res, attempt)));
    res = await towerFetch(path, init);
  }
  return res;
}
