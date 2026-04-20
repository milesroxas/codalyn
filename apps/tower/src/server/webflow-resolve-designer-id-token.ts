import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/shared/lib/db";
import { webflowOAuthToken } from "@/shared/lib/db/auth-schema";

const RESOLVE_URL = "https://api.webflow.com/beta/token/resolve";

export type WebflowResolvedDesignerUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  siteId: string | null;
};

function pickString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export async function resolveWebflowDesignerIdToken(
  idToken: string,
  dataApiBearer: string
): Promise<WebflowResolvedDesignerUser | null> {
  const res = await fetch(RESOLVE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${dataApiBearer}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ token: idToken }),
  });

  if (!res.ok) {
    return null;
  }

  const raw = (await res.json()) as Record<string, unknown>;
  const id = pickString(raw.userId) ?? pickString(raw.id) ?? pickString(raw.user_id);
  const email = pickString(raw.email)?.toLowerCase();
  if (!id || !email) {
    return null;
  }

  return {
    id,
    email,
    firstName: pickString(raw.firstName) ?? pickString(raw.first_name) ?? null,
    lastName: pickString(raw.lastName) ?? pickString(raw.last_name) ?? null,
    siteId: pickString(raw.siteId) ?? pickString(raw.site_id) ?? null,
  };
}

/**
 * Bearer for `POST /beta/token/resolve` must have Webflow scope `authorized_user:read`.
 * Prefer the signed-in user's stored OAuth access token; else env (see `.env.example`).
 */
export async function pickBearerForWebflowIdTokenResolve(request: Request): Promise<string | undefined> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session?.user?.id) {
    const rows = await db
      .select({ accessToken: webflowOAuthToken.accessToken })
      .from(webflowOAuthToken)
      .where(eq(webflowOAuthToken.userId, session.user.id))
      .limit(1);
    const t = rows[0]?.accessToken?.trim();
    if (t) {
      return t;
    }
  }
  return process.env.WEBFLOW_TOKEN_RESOLVE_BEARER?.trim() || process.env.WEBFLOW_API_TOKEN?.trim() || undefined;
}
