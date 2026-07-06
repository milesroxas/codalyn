import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { resolveAuthSecret } from "@/server/auth-secret";
import { normalizeAccessEmail } from "@/shared/lib/access/email-input";
import { TOWER_TEAM_INVITE_ACCEPT_TOKEN_HEADER } from "@/shared/lib/membership/team-invitation-header";

/**
 * Secret, single-recipient acceptance token for team invitations.
 *
 * Unlike the invitation id (which the *inviter* knows), this HMAC-signed token is minted server-side
 * when the invitation email is sent and is embedded ONLY in that email — the inviter never sees it.
 * So possession proves the holder read the invited inbox, which is genuine email-ownership proof and
 * is safe to use to auto-verify the email at sign-up. This closes the account-pre-hijack hole while
 * keeping invited-user onboarding to a single click (no separate verification email).
 *
 * Domain-separated from operator invite tokens via the HMAC prefix so the two can never be confused.
 */
const HMAC_DOMAIN = "team-invite-accept.v1.";
const VERSION = 1 as const;

type PayloadV1 = { v: typeof VERSION; inv: string; e: string; exp: number; jti: string };

/** 7 days — comfortably covers the invitation's own validity window. */
export const TEAM_INVITATION_ACCEPT_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sign(payloadB64: string): string {
  return createHmac("sha256", resolveAuthSecret()).update(`${HMAC_DOMAIN}${payloadB64}`).digest("base64url");
}

export function signTeamInvitationAcceptToken(
  invitationId: string,
  email: string,
  ttlMs = TEAM_INVITATION_ACCEPT_TOKEN_TTL_MS
): string {
  const inv = invitationId.trim();
  const e = normalizeAccessEmail(email);
  if (!inv || !e.includes("@")) {
    throw new Error("invalid_team_invitation_accept_token_input");
  }
  const exp = Math.floor((Date.now() + ttlMs) / 1000);
  const payload = Buffer.from(
    JSON.stringify({ v: VERSION, inv, e, exp, jti: randomUUID() } satisfies PayloadV1),
    "utf8"
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyTeamInvitationAcceptToken(token: string): { invitationId: string; email: string } | null {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) {
    return null;
  }
  const payload = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  const expected = sign(payload);
  const sigBuf = Buffer.from(sig, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PayloadV1;
    if (
      json.v !== VERSION ||
      typeof json.inv !== "string" ||
      typeof json.e !== "string" ||
      typeof json.exp !== "number"
    ) {
      return null;
    }
    if (json.exp * 1000 < Date.now()) {
      return null;
    }
    if (!json.inv.trim() || !json.e.includes("@")) {
      return null;
    }
    return { invitationId: json.inv, email: json.e };
  } catch {
    return null;
  }
}

/** True when `token` is a valid acceptance token issued for `email` (proves inbox ownership). */
export function isValidTeamInviteAcceptTokenForEmail(token: string, email: string): boolean {
  const parsed = verifyTeamInvitationAcceptToken(token);
  return parsed !== null && parsed.email === normalizeAccessEmail(email);
}

/** Read the acceptance token from a Better Auth request/middleware context header. */
export function readTeamInviteAcceptTokenFromAuthContext(ctx: unknown): string | null {
  if (!ctx || typeof ctx !== "object") {
    return null;
  }
  const authCtx = ctx as {
    request?: Request;
    headers?: Headers;
    getHeader?: (name: string) => string | null | undefined;
  };
  const fromRequest = authCtx.request?.headers?.get(TOWER_TEAM_INVITE_ACCEPT_TOKEN_HEADER)?.trim();
  if (fromRequest) {
    return fromRequest;
  }
  const fromHeaders = authCtx.headers?.get(TOWER_TEAM_INVITE_ACCEPT_TOKEN_HEADER)?.trim();
  if (fromHeaders) {
    return fromHeaders;
  }
  if (typeof authCtx.getHeader === "function") {
    return authCtx.getHeader(TOWER_TEAM_INVITE_ACCEPT_TOKEN_HEADER)?.trim() || null;
  }
  return null;
}
