import { createHmac, timingSafeEqual } from "node:crypto";
import { resolveAuthSecret } from "@/server/auth-secret";

const VERSION = 1 as const;

type PayloadV1 = { v: typeof VERSION; e: string; exp: number };

/** Default 14 days — long enough for email + onboarding. */
export const OPERATOR_CUSTOMER_INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function signOperatorCustomerInviteToken(email: string, ttlMs = OPERATOR_CUSTOMER_INVITE_TTL_MS): string {
  const e = email.trim().toLowerCase();
  if (!e.includes("@")) {
    throw new Error("invalid_email");
  }
  const exp = Math.floor((Date.now() + ttlMs) / 1000);
  const payload = Buffer.from(JSON.stringify({ v: VERSION, e, exp } satisfies PayloadV1), "utf8").toString("base64url");
  const sig = createHmac("sha256", resolveAuthSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyOperatorCustomerInviteToken(token: string): { email: string } | null {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) {
    return null;
  }
  const payload = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  const expected = createHmac("sha256", resolveAuthSecret()).update(payload).digest("base64url");
  const sigBuf = Buffer.from(sig, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PayloadV1;
    if (json.v !== VERSION || typeof json.e !== "string" || typeof json.exp !== "number") {
      return null;
    }
    if (json.exp * 1000 < Date.now()) {
      return null;
    }
    if (!json.e.includes("@")) {
      return null;
    }
    return { email: json.e };
  } catch {
    return null;
  }
}
