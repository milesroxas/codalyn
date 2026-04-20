import { isAPIError } from "better-auth/api";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { deriveWebflowDesignerCredentialPassword } from "@/server/derive-webflow-designer-password";
import type { WebflowResolvedDesignerUser } from "@/server/webflow-resolve-designer-id-token";
import { db } from "@/shared/lib/db";
import { account, user } from "@/shared/lib/db/auth-schema";

type UserRow = typeof user.$inferSelect;

async function findOrLinkRow(
  resolved: WebflowResolvedDesignerUser,
  password: string
): Promise<UserRow | "conflict" | null> {
  const [byWf] = await db.select().from(user).where(eq(user.webflowAuthorizedUserId, resolved.id)).limit(1);
  if (byWf) {
    return byWf;
  }

  const [byEmail] = await db.select().from(user).where(eq(user.email, resolved.email)).limit(1);
  if (!byEmail) {
    return null;
  }
  if (byEmail.webflowAuthorizedUserId && byEmail.webflowAuthorizedUserId !== resolved.id) {
    return "conflict";
  }
  if (!byEmail.webflowAuthorizedUserId) {
    const hashed = await hashPassword(password);
    await db
      .update(account)
      .set({ password: hashed })
      .where(and(eq(account.userId, byEmail.id), eq(account.providerId, "credential")));
    await db.update(user).set({ webflowAuthorizedUserId: resolved.id }).where(eq(user.id, byEmail.id));
    return { ...byEmail, webflowAuthorizedUserId: resolved.id };
  }
  return byEmail;
}

export type DesignerSessionResult =
  | { ok: true; user: unknown; token: string }
  | { ok: false; status: number; message: string };

export async function establishDesignerBetterAuthSession(
  request: Request,
  resolved: WebflowResolvedDesignerUser
): Promise<DesignerSessionResult> {
  const password = deriveWebflowDesignerCredentialPassword(resolved.id);
  const row = await findOrLinkRow(resolved, password);

  if (row === "conflict") {
    return { ok: false, status: 409, message: "webflow_user_mismatch" };
  }

  if (!row) {
    const displayName = [resolved.firstName, resolved.lastName].filter(Boolean).join(" ").trim() || resolved.email;
    try {
      const signedUp = await auth.api.signUpEmail({
        body: {
          name: displayName,
          email: resolved.email,
          password,
          rememberMe: true,
        },
        headers: request.headers,
      });
      await db.update(user).set({ webflowAuthorizedUserId: resolved.id }).where(eq(user.email, resolved.email));
      if (!signedUp.token) {
        return { ok: false, status: 500, message: "session_not_issued" };
      }
      return { ok: true, user: signedUp.user, token: signedUp.token };
    } catch (e: unknown) {
      if (isAPIError(e)) {
        return { ok: false, status: 400, message: (e as Error).message ?? "sign_up_failed" };
      }
      throw e;
    }
  }

  try {
    const signedIn = await auth.api.signInEmail({
      body: {
        email: resolved.email,
        password,
        rememberMe: true,
      },
      headers: request.headers,
    });
    return { ok: true, user: signedIn.user, token: signedIn.token };
  } catch (e: unknown) {
    if (isAPIError(e)) {
      return { ok: false, status: 401, message: (e as Error).message ?? "sign_in_failed" };
    }
    throw e;
  }
}
