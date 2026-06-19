import { getSessionCookie } from "better-auth/cookies";
import { resolveTowerCookiePrefix } from "@/server/tower-hosts";

/**
 * Presence check for Tower's Better Auth session cookie, honoring the per-environment cookie prefix
 * (see {@link resolveTowerCookiePrefix}). Every reader must go through this — calling
 * `getSessionCookie` directly with the default name would look for the wrong cookie on production or
 * preview and make a signed-in user appear logged out.
 */
export function readTowerSessionCookie(request: Request | Headers): string | null {
  return getSessionCookie(request, { cookiePrefix: resolveTowerCookiePrefix() });
}
