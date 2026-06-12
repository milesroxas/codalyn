import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";

/**
 * Beacon → Tower session handoff.
 *
 * The Designer extension authenticates Tower with a Better Auth bearer token (cross-origin), so a
 * freshly opened top-level Tower tab has no first-party cookie and would bounce to `/sign-in`.
 * Beacon mints a single-use one-time token (`/api/auth/one-time-token/generate`, authorized by its
 * bearer) and opens this route. Redeeming the token deletes it immediately and sets the session
 * cookie (via the `oneTimeToken` plugin + `nextCookies`), after which we redirect to the in-app
 * destination.
 *
 * The token is single-use, short-lived, and never carries the session value, so a leaked URL cannot
 * replay a session. `callbackUrl` is sanitized to a relative path to prevent open redirects, and the
 * one-time-token URL is not forwarded to the destination (`Referrer-Policy: no-referrer`).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("ott")?.trim();
  const callbackUrl = sanitizeRelativePath(url.searchParams.get("callbackUrl") ?? "/");

  if (token) {
    try {
      await auth.api.verifyOneTimeToken({ body: { token }, headers: await headers() });
    } catch {
      // Invalid, expired, or already-used token: fall through. The destination enforces its own
      // auth (middleware redirects to /sign-in when no session cookie was established).
    }
  }

  const response = NextResponse.redirect(new URL(callbackUrl, request.url));
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
