import { timingSafeEqual } from "node:crypto";

import { auth } from "@/server/auth";

function parseBearerToken(request: Request): string | undefined {
  const value = request.headers.get("authorization");
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

function timingSafeEqualString(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export type TowerApiAuthResult = { ok: true; userId?: string } | { ok: false; response: Response };

/**
 * Tower `/api/v1/*` auth: Better Auth session first, then optional `BEACON_API_KEY` Bearer.
 *
 * Session: `Authorization: Bearer <session_token>` (bearer plugin) and/or cookies on Tower’s origin.
 * Webflow Data API proxy loads per-user OAuth tokens from Postgres; that requires `userId` from session.
 *
 * `BEACON_API_KEY` must not win over a real Tower session: the extension often sends both `credentials` (Tower cookies
 * after sign-in) and `Authorization: Bearer <api key>` when no session token is in localStorage—matching the key first
 * dropped `userId` and made Webflow look “disconnected” despite being logged in.
 */
export async function verifyTowerApiRequest(request: Request): Promise<TowerApiAuthResult> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (session?.user?.id) {
    return { ok: true, userId: session.user.id };
  }

  const apiKey = process.env.BEACON_API_KEY?.trim();
  if (apiKey) {
    const bearer = parseBearerToken(request);
    if (bearer && timingSafeEqualString(bearer, apiKey)) {
      return { ok: true };
    }
  }

  return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
}
