import { markEmailVerifiedForEmail } from "@/server/membership/email-verification-trust";
import { verifyOperatorCustomerInviteToken } from "@/server/operator-customer-invite-token";
import { normalizeAccessEmail } from "@/shared/lib/access/email-input";

export function isValidOperatorInviteForEmail(token: string, email: string): boolean {
  const parsed = verifyOperatorCustomerInviteToken(token);
  if (!parsed) {
    return false;
  }
  return parsed.email === normalizeAccessEmail(email);
}

/** Operator / early-access invite link possession + email match is treated as verified email ownership. */
export async function trustEmailForOperatorInvite(email: string, token: string | null | undefined): Promise<boolean> {
  const trimmedToken = token?.trim();
  if (!trimmedToken) {
    return false;
  }
  if (!isValidOperatorInviteForEmail(trimmedToken, email)) {
    return false;
  }
  await markEmailVerifiedForEmail(email);
  return true;
}
