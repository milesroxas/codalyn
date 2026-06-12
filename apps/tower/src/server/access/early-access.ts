import { APIError } from "better-auth/api";
import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { isTowerProductAdmin } from "@/server/membership/product-admin";
import { verifyOperatorCustomerInviteToken } from "@/server/operator-customer-invite-token";
import { EARLY_ACCESS_REQUIRED_CODE, EARLY_ACCESS_REQUIRED_MESSAGE } from "@/shared/lib/access/early-access-copy";
import { normalizeAccessEmail } from "@/shared/lib/access/email-input";
import { TOWER_OPERATOR_INVITE_HEADER } from "@/shared/lib/access/operator-invite-header";
import { db } from "@/shared/lib/db";
import { invitation, member, user } from "@/shared/lib/db/auth-schema";

export {
  normalizeAccessEmail,
  parseAccessEmailInput,
  parseTeamMemberEmailsInput,
} from "@/shared/lib/access/email-input";

function readOperatorInviteTokenFromHeaders(headers: Headers): string | null {
  const value = headers.get(TOWER_OPERATOR_INVITE_HEADER)?.trim();
  return value || null;
}

function readOperatorInviteTokenFromRequest(request: Request | undefined): string | null {
  if (!request?.headers) {
    return null;
  }
  return readOperatorInviteTokenFromHeaders(request.headers);
}

export function readOperatorInviteTokenFromAuthContext(ctx: unknown): string | null {
  if (!ctx || typeof ctx !== "object") {
    return null;
  }
  const authCtx = ctx as {
    request?: Request;
    headers?: Headers;
    getHeader?: (name: string) => string | null | undefined;
  };
  const fromRequest = readOperatorInviteTokenFromRequest(authCtx.request);
  if (fromRequest) {
    return fromRequest;
  }
  if (authCtx.headers) {
    const fromHeaders = readOperatorInviteTokenFromHeaders(authCtx.headers);
    if (fromHeaders) {
      return fromHeaders;
    }
  }
  if (typeof authCtx.getHeader === "function") {
    const value = authCtx.getHeader(TOWER_OPERATOR_INVITE_HEADER)?.trim();
    return value || null;
  }
  return null;
}

function operatorInviteTokenMatchesEmail(token: string, email: string): boolean {
  const parsed = verifyOperatorCustomerInviteToken(token);
  if (!parsed) {
    return false;
  }
  return parsed.email === normalizeAccessEmail(email);
}

export async function emailHasPendingOrgInvitation(email: string): Promise<boolean> {
  const normalized = normalizeAccessEmail(email);
  const [row] = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(
      and(
        sql`lower(${invitation.email}) = ${normalized}`,
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date())
      )
    )
    .limit(1);
  return Boolean(row);
}

async function userHasOrgMembership(userId: string): Promise<boolean> {
  const [{ n }] = await db.select({ n: count() }).from(member).where(eq(member.userId, userId));
  return n > 0;
}

export async function grantEarlyAccess(userId: string): Promise<void> {
  await db
    .update(user)
    .set({ earlyAccessGrantedAt: new Date() })
    .where(and(eq(user.id, userId), isNull(user.earlyAccessGrantedAt)));
}

export async function emailMayRegister(email: string, operatorInviteToken: string | null): Promise<boolean> {
  if (!isTowerEarlyAccessGateEnabled()) {
    return true;
  }
  const normalized = normalizeAccessEmail(email);
  if (await emailHasPendingOrgInvitation(normalized)) {
    return true;
  }
  if (operatorInviteToken && operatorInviteTokenMatchesEmail(operatorInviteToken, normalized)) {
    return true;
  }
  return false;
}

export async function userMaySignIn(userRow: {
  id: string;
  email: string;
  role: string | null;
  earlyAccessGrantedAt: Date | null;
}): Promise<boolean> {
  if (!isTowerEarlyAccessGateEnabled()) {
    return true;
  }
  if (isTowerProductAdmin(userRow)) {
    return true;
  }
  if (userRow.earlyAccessGrantedAt) {
    return true;
  }
  if (await userHasOrgMembership(userRow.id)) {
    return true;
  }
  if (await emailHasPendingOrgInvitation(userRow.email)) {
    return true;
  }
  return false;
}

export async function assertEmailMaySignUp(email: string, operatorInviteToken: string | null): Promise<void> {
  if (await emailMayRegister(email, operatorInviteToken)) {
    return;
  }
  throw new APIError("BAD_REQUEST", {
    message: EARLY_ACCESS_REQUIRED_MESSAGE,
    code: EARLY_ACCESS_REQUIRED_CODE,
  });
}

export async function assertUserMaySignInByEmail(email: string): Promise<void> {
  if (!isTowerEarlyAccessGateEnabled()) {
    return;
  }
  const normalized = normalizeAccessEmail(email);
  const [row] = await db
    .select({
      id: user.id,
      email: user.email,
      role: user.role,
      earlyAccessGrantedAt: user.earlyAccessGrantedAt,
    })
    .from(user)
    .where(sql`lower(${user.email}) = ${normalized}`)
    .limit(1);

  if (!row) {
    return;
  }

  if (await userMaySignIn(row)) {
    return;
  }

  throw new APIError("FORBIDDEN", {
    message: EARLY_ACCESS_REQUIRED_MESSAGE,
    code: EARLY_ACCESS_REQUIRED_CODE,
  });
}
