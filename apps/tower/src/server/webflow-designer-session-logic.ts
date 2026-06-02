import { eq } from "drizzle-orm";
import { emailMayRegister, grantEarlyAccess, userMaySignIn } from "@/server/access/early-access";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { auth } from "@/server/auth";
import type { WebflowResolvedDesignerUser } from "@/server/webflow-resolve-designer-id-token";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

type UserRow = typeof user.$inferSelect;

/**
 * Better Auth `account.providerId` for the federated Webflow Designer identity.
 *
 * The Designer ID-token flow is a verified-identity exchange (Webflow vouches for the user via
 * `getIdToken` → `POST /beta/token/resolve`), not a password login. We therefore link it as its
 * own provider account — like a social/OIDC provider — and never touch the user's `credential`
 * (email/password) row. This keeps the two sign-in methods independent: signing in through the
 * Designer never invalidates a password the user chose, and vice versa.
 */
const WEBFLOW_DESIGNER_PROVIDER_ID = "webflow";

/** Minimal, non-sensitive user projection returned to the Designer extension (it only needs the token). */
export type DesignerSessionUser = {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
};

export type DesignerSessionResult =
  | { ok: true; user: DesignerSessionUser; token: string }
  | { ok: false; status: number; message: string };

function toDesignerSessionUser(row: UserRow): DesignerSessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    firstName: row.firstName,
    lastName: row.lastName,
  };
}

function resolveDisplayName(resolved: WebflowResolvedDesignerUser): string {
  return [resolved.firstName, resolved.lastName].filter(Boolean).join(" ").trim() || resolved.email;
}

async function findUserByWebflowAuthorizedUserId(webflowAuthorizedUserId: string): Promise<UserRow | null> {
  const [row] = await db.select().from(user).where(eq(user.webflowAuthorizedUserId, webflowAuthorizedUserId)).limit(1);
  return row ?? null;
}

async function findUserByEmail(email: string): Promise<UserRow | null> {
  const [row] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  return row ?? null;
}

/** Idempotently ensure a non-credential `webflow` account row links this user to the resolved Designer identity. */
async function ensureWebflowDesignerAccountLinked(userId: string, webflowAuthorizedUserId: string): Promise<void> {
  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findAccountByProviderId(
    webflowAuthorizedUserId,
    WEBFLOW_DESIGNER_PROVIDER_ID
  );
  if (existing) {
    return;
  }
  await ctx.internalAdapter.linkAccount({
    userId,
    providerId: WEBFLOW_DESIGNER_PROVIDER_ID,
    accountId: webflowAuthorizedUserId,
  });
}

/** Mint a Better Auth session for an already-resolved user without any password verification. */
async function issueDesignerSession(row: UserRow): Promise<DesignerSessionResult> {
  const ctx = await auth.$context;
  const session = await ctx.internalAdapter.createSession(row.id);
  if (!session) {
    return { ok: false, status: 500, message: "session_not_issued" };
  }
  return { ok: true, user: toDesignerSessionUser(row), token: session.token };
}

/**
 * Finalize sign-in for an existing Tower user: enforce the early-access gate, ensure the Designer
 * identity is linked + email marked verified (Webflow has verified it), then issue a session.
 */
async function finalizeExistingDesignerUser(
  row: UserRow,
  resolved: WebflowResolvedDesignerUser
): Promise<DesignerSessionResult> {
  if (!(await userMaySignIn(row))) {
    return { ok: false, status: 403, message: "early_access_required" };
  }

  const linkWebflowId = row.webflowAuthorizedUserId !== resolved.id;
  const verifyEmail = !row.emailVerified;
  if (linkWebflowId || verifyEmail) {
    await db
      .update(user)
      .set({
        ...(linkWebflowId ? { webflowAuthorizedUserId: resolved.id } : {}),
        ...(verifyEmail ? { emailVerified: true } : {}),
      })
      .where(eq(user.id, row.id));
  }
  await ensureWebflowDesignerAccountLinked(row.id, resolved.id);

  return issueDesignerSession(row);
}

/**
 * Provision a brand-new Tower user from the Designer identity: a verified user plus a linked
 * `webflow` provider account, with no password credential. The early-access grant is applied
 * explicitly (idempotent) so it does not depend on database-hook transaction-flush timing.
 */
async function provisionNewDesignerUser(resolved: WebflowResolvedDesignerUser): Promise<DesignerSessionResult> {
  if (!(await emailMayRegister(resolved.email, null))) {
    return { ok: false, status: 403, message: "early_access_required" };
  }

  const ctx = await auth.$context;
  try {
    const created = await ctx.internalAdapter.createUser({
      name: resolveDisplayName(resolved),
      email: resolved.email,
      emailVerified: true,
      firstName: resolved.firstName ?? undefined,
      lastName: resolved.lastName ?? undefined,
      webflowAuthorizedUserId: resolved.id,
    });
    await ensureWebflowDesignerAccountLinked(created.id, resolved.id);

    if (isTowerEarlyAccessGateEnabled()) {
      await grantEarlyAccess(created.id);
    }

    const row = await findUserByEmail(resolved.email);
    if (!row) {
      return { ok: false, status: 500, message: "user_not_persisted" };
    }
    return issueDesignerSession(row);
  } catch {
    // A concurrent Designer exchange may have created the user between our lookup and insert.
    const raced = (await findUserByWebflowAuthorizedUserId(resolved.id)) ?? (await findUserByEmail(resolved.email));
    if (raced) {
      return finalizeExistingDesignerUser(raced, resolved);
    }
    return { ok: false, status: 400, message: "sign_up_failed" };
  }
}

/**
 * Establish a Better Auth session for a Webflow Designer user resolved from an ID token.
 *
 * Identity is matched by the stable Webflow `authorized_user` id first, then by the
 * Webflow-verified email (which links the Designer identity to an existing account). No email/password
 * credential is ever created or modified by this flow.
 */
export async function establishDesignerBetterAuthSession(
  resolved: WebflowResolvedDesignerUser
): Promise<DesignerSessionResult> {
  const byWebflowId = await findUserByWebflowAuthorizedUserId(resolved.id);
  if (byWebflowId) {
    return finalizeExistingDesignerUser(byWebflowId, resolved);
  }

  const byEmail = await findUserByEmail(resolved.email);
  if (byEmail) {
    if (byEmail.webflowAuthorizedUserId && byEmail.webflowAuthorizedUserId !== resolved.id) {
      return { ok: false, status: 409, message: "webflow_user_mismatch" };
    }
    return finalizeExistingDesignerUser(byEmail, resolved);
  }

  return provisionNewDesignerUser(resolved);
}
