/**
 * Decode Better Auth email verification JWT payload for routing only.
 * Authorization still happens in Better Auth's verify-email handler.
 */
export function readEmailVerificationTokenPayload(token: string): {
  email: string | null;
  updateTo: string | null;
  requestType: string | null;
} {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { email: null, updateTo: null, requestType: null };
  }
  try {
    const json = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      email?: unknown;
      updateTo?: unknown;
      requestType?: unknown;
    };
    return {
      email: typeof json.email === "string" ? json.email : null,
      updateTo: typeof json.updateTo === "string" ? json.updateTo : null,
      requestType: typeof json.requestType === "string" ? json.requestType : null,
    };
  } catch {
    return { email: null, updateTo: null, requestType: null };
  }
}

export function isChangeEmailVerificationRequest(token: string): boolean {
  return readEmailVerificationTokenPayload(token).requestType === "change-email-verification";
}

export function rewriteVerifyEmailCallbackUrl(verifyUrl: string, callbackUrl: string): string {
  const parsed = new URL(verifyUrl);
  parsed.searchParams.set("callbackURL", callbackUrl);
  return parsed.toString();
}
