import { and, eq } from "drizzle-orm";
import { emailMayRegister, grantEarlyAccess, userMaySignIn } from "@/server/access/early-access";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { auth } from "@/server/auth";
import { WEBFLOW_DATA_API_APP_KEY, type WebflowAppKey } from "@/server/webflow-app-registry";
import {
  bindWebflowUserToTowerUser,
  chooseBoundTowerUser,
  findInstallTimeAuthorizationUser,
  listTowerUsersBoundToWebflowUser,
  userHoldsAuthorizationForSite,
} from "@/server/webflow-designer-identity";
import type { WebflowResolvedDesignerUser } from "@/server/webflow-resolve-designer-id-token";
import { db } from "@/shared/lib/db";
import { account, session, user } from "@/shared/lib/db/auth-schema";

type UserRow = typeof user.$inferSelect;

/**
 * What the Designer ID-token exchange may do beyond signing in.
 *
 * - `restore` — the extension's silent run on load/focus: sign the verified Webflow user into the Tower
 *   account already associated with them (Designer link, or the account that completed the install-time
 *   OAuth as that Webflow user). Nothing is created, linked by e-mail, verified or revoked; with no such
 *   account the answer is `no_tower_account`. Restoring a session never involves OAuth (Marketplace
 *   guidelines, "Session behavior": log back in with standard authentication without redoing OAuth).
 * - `sign_in` — the user's explicit "Continue with Webflow" click (and untagged requests from older
 *   extension builds): the same, then linking a Tower account with the same Webflow-verified e-mail, then
 *   creating a new Tower account. Those are state-changing, so they follow a click, never a load.
 */
export type DesignerExchangeIntent = "restore" | "sign_in";

/** Boundary reader: exactly `"restore"` restores; anything else — including no value — is the full sign-in. */
export function readDesignerExchangeIntent(raw: unknown): DesignerExchangeIntent {
  return raw === "restore" ? "restore" : "sign_in";
}

export type DesignerSessionOptions = {
  intent: DesignerExchangeIntent;
  /** The Designer site the ID token was issued on (already validated as a site id), when known. */
  siteId: string | null;
  app: WebflowAppKey;
};

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

async function findUserById(id: string): Promise<UserRow | null> {
  const [row] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  return row ?? null;
}

async function findUserByEmail(email: string): Promise<UserRow | null> {
  const [row] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  return row ?? null;
}

/** Better Auth `account.providerId` of an email + password credential. */
const CREDENTIAL_PROVIDER_ID = "credential";

/**
 * Whether linking a Webflow-verified Designer identity to an existing Tower account *by e-mail* must first
 * revoke that account's password and sessions.
 *
 * An unverified email + password account is not proof of anything: anyone can sign up with someone
 * else's address and wait. If the real owner later signs in through the Designer, Webflow has verified
 * the address, and the exchange links it to that pre-created account — and marks it verified, which
 * would switch on the password the impostor chose (account pre-hijack; same trust rule as the invite
 * model: `emailVerified` only ever follows genuine ownership proof, and a credential minted before
 * that proof is not the owner's). So the credential is dropped and every session revoked; the owner
 * sets a password through the email reset, which only their inbox can complete. Verified accounts
 * and accounts with no password are untouched. Accounts reached through a Webflow-id link or the
 * install-time authorization never come here: that pair was proven by the ID token or by the OAuth
 * completed from the account's own signed-in session, not by an inbox.
 */
export function mustRevokeCredentialBeforeDesignerLink(existing: {
  emailVerified: boolean;
  hasCredentialAccount: boolean;
}): boolean {
  return !existing.emailVerified && existing.hasCredentialAccount;
}

async function hasCredentialAccount(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, CREDENTIAL_PROVIDER_ID)))
    .limit(1);
  return rows.length > 0;
}

/** Drops the password credential and every session of a not-yet-verified account before the e-mail link. */
async function revokeUnverifiedCredential(userId: string): Promise<void> {
  await db.delete(account).where(and(eq(account.userId, userId), eq(account.providerId, CREDENTIAL_PROVIDER_ID)));
  await db.delete(session).where(eq(session.userId, userId));
  // User id only — no email in function logs.
  console.warn(`[tower/webflow-designer] revoked the unverified password credential of user ${userId} before linking`);
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
 * Sign-in for an account already associated with the Webflow user (Designer link or install-time
 * authorization): the early-access gate, then a session. No e-mail verification flip and no credential
 * revocation — the account's own e-mail may legitimately differ from the Webflow user's.
 */
async function finalizeAssociatedDesignerUser(row: UserRow): Promise<DesignerSessionResult> {
  if (!(await userMaySignIn(row))) {
    return { ok: false, status: 403, message: "early_access_required" };
  }
  return issueDesignerSession(row);
}

/**
 * Sign-in for an existing Tower user matched *by Webflow-verified e-mail* (explicit sign-in only): enforce
 * the early-access gate, apply the pre-hijack rule, mark the e-mail verified (Webflow has verified it),
 * record the Designer link, then issue a session.
 */
async function finalizeEmailMatchedDesignerUser(
  row: UserRow,
  resolved: WebflowResolvedDesignerUser
): Promise<DesignerSessionResult> {
  if (!(await userMaySignIn(row))) {
    return { ok: false, status: 403, message: "early_access_required" };
  }

  const verifyEmail = !row.emailVerified;
  if (
    mustRevokeCredentialBeforeDesignerLink({
      emailVerified: row.emailVerified,
      hasCredentialAccount: verifyEmail ? await hasCredentialAccount(row.id) : false,
    })
  ) {
    await revokeUnverifiedCredential(row.id);
  }
  if (verifyEmail) {
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, row.id));
  }
  await bindWebflowUserToTowerUser(resolved.id, row.id);

  return issueDesignerSession(row);
}

/**
 * Provision a brand-new Tower user from the Designer identity (explicit sign-in only): a verified user
 * plus a linked `webflow` provider account, with no password credential. The early-access grant is
 * applied explicitly (idempotent) so it does not depend on database-hook transaction-flush timing.
 */
async function provisionNewDesignerUser(
  resolved: WebflowResolvedDesignerUser,
  options: DesignerSessionOptions
): Promise<DesignerSessionResult> {
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
    await bindWebflowUserToTowerUser(resolved.id, created.id);

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
    const raced = await findAssociatedDesignerUser(resolved, options);
    if (raced) {
      return finalizeAssociatedDesignerUser(raced);
    }
    const byEmail = await findUserByEmail(resolved.email);
    if (byEmail) {
      return finalizeEmailMatchedDesignerUser(byEmail, resolved);
    }
    return { ok: false, status: 400, message: "sign_up_failed" };
  }
}

/**
 * The Tower account associated with the Webflow user by identity: the Designer link first (preferring,
 * among several, the account holding an authorization for the Designer's current site), else the
 * install-time authorization — the account that completed the OAuth this Webflow user approved — which
 * is then linked for next time. Never consults e-mail addresses.
 */
async function findAssociatedDesignerUser(
  resolved: WebflowResolvedDesignerUser,
  options: DesignerSessionOptions
): Promise<UserRow | null> {
  const bound = await listTowerUsersBoundToWebflowUser(resolved.id);
  if (bound.length > 0) {
    const candidates = await Promise.all(
      bound.map(async (entry) => ({
        ...entry,
        holdsAuthorizationForSite:
          bound.length > 1 ? await userHoldsAuthorizationForSite(entry.userId, options.siteId, options.app) : false,
      }))
    );
    const chosen = chooseBoundTowerUser(candidates);
    const row = chosen ? await findUserById(chosen) : null;
    if (row) {
      return row;
    }
  }

  const installer = await findInstallTimeAuthorizationUser(resolved.id, options.siteId, options.app);
  if (installer) {
    const row = await findUserById(installer.userId);
    if (row) {
      await bindWebflowUserToTowerUser(resolved.id, row.id);
      console.info(
        `[tower/webflow-designer] linked webflow user ${resolved.id} to the install-time account of org ${installer.organizationId}`
      );
      return row;
    }
  }
  return null;
}

/**
 * Establish a Better Auth session for a Webflow Designer user resolved from an ID token.
 *
 * Identity is matched by the stable Webflow `authorized_user` id: the Designer link, then the install-time
 * authorization that Webflow user approved (review round 9). Only the explicit `sign_in` intent goes on to
 * the Webflow-verified e-mail (linking an existing same-e-mail account) and to provisioning a new account.
 * No email/password credential is ever created by this flow.
 */
export async function establishDesignerBetterAuthSession(
  resolved: WebflowResolvedDesignerUser,
  options: DesignerSessionOptions = { intent: "sign_in", siteId: null, app: WEBFLOW_DATA_API_APP_KEY }
): Promise<DesignerSessionResult> {
  const associated = await findAssociatedDesignerUser(resolved, options);
  if (associated) {
    return finalizeAssociatedDesignerUser(associated);
  }

  if (options.intent === "restore") {
    return { ok: false, status: 404, message: "no_tower_account" };
  }

  const byEmail = await findUserByEmail(resolved.email);
  if (byEmail) {
    if (byEmail.webflowAuthorizedUserId && byEmail.webflowAuthorizedUserId !== resolved.id) {
      // The account with this e-mail is the Designer identity of a *different* Webflow user. Its owner can
      // sign in with the password and relink Webflow from Tower's Connection page (the install-time
      // binding), which never depends on the e-mail matching.
      return { ok: false, status: 409, message: "webflow_user_mismatch" };
    }
    return finalizeEmailMatchedDesignerUser(byEmail, resolved);
  }

  return provisionNewDesignerUser(resolved, options);
}
