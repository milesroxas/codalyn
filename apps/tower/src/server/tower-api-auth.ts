import { auth } from "@/server/auth";

export type TowerApiAuthResult = { ok: true; userId: string } | { ok: false; response: Response };

/**
 * Tower `/api/v1/*` and `/api/v2/webflow/*` auth: a Better Auth session, resolved server-side from
 * `Authorization: Bearer <session_token>` (bearer plugin) and/or Tower's session cookie. Every action
 * is attributed to that user; there is no shared service credential (the former `BEACON_API_KEY`
 * bearer was removed for the Marketplace submission — a static key in a client bundle is a reusable
 * credential and grants access with no user identity).
 */
export async function verifyTowerApiRequest(request: Request): Promise<TowerApiAuthResult> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (session?.user?.id) {
    return { ok: true, userId: session.user.id };
  }
  return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
}
