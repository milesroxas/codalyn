import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";

/**
 * Beacon → Tower session handoff (token redemption).
 *
 * The Designer extension authenticates Tower with a Better Auth bearer token (cross-origin), so a
 * freshly opened top-level Tower tab has no first-party cookie and would bounce to `/sign-in`.
 * Beacon mints a single-use one-time token (`/api/auth/one-time-token/generate`, authorized by its
 * bearer) and opens `/beacon-handoff` with the token in the URL **fragment** (never a query
 * parameter — fragments are not sent to the server, so the token cannot appear in server, proxy,
 * or CDN access logs). That page strips the fragment from history and redeems the token here via
 * POST body. Redeeming deletes the token immediately and sets the session cookie (via the
 * `oneTimeToken` plugin + `nextCookies`); the page then navigates to the sanitized in-app
 * destination client-side.
 *
 * The token is single-use, short-lived, and never carries the session value, so a leaked value
 * cannot replay a session. The response is `200 {ok}` regardless of token validity (no oracle);
 * the destination enforces its own auth (middleware redirects to /sign-in when no session cookie
 * was established).
 *
 * Same-origin only: redemption sets a first-party session cookie, so a cross-site POST must not be
 * able to log the victim's browser into an attacker's session (login CSRF). Browsers always send
 * `Origin` on POST; anything but Tower's own origin is rejected, as is a non-JSON content type.
 */
export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin == null || origin !== requestOrigin) {
    return NextResponse.json({ ok: false }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json({ ok: false }, { status: 415, headers: { "Cache-Control": "no-store" } });
  }

  let token = "";
  try {
    const body: unknown = await request.json();
    if (body != null && typeof body === "object" && "token" in body) {
      const raw = (body as { token: unknown }).token;
      token = typeof raw === "string" ? raw.trim() : "";
    }
  } catch {
    // Malformed body → treated as no token; same non-oracle response below.
  }

  if (token) {
    try {
      await auth.api.verifyOneTimeToken({ body: { token }, headers: await headers() });
    } catch {
      // Invalid, expired, or already-used token: fall through without a session cookie.
    }
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } }
  );
}
