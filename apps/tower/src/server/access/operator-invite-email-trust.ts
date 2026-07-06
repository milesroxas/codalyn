import { verifyOperatorCustomerInviteToken } from "@/server/operator-customer-invite-token";
import { normalizeAccessEmail } from "@/shared/lib/access/email-input";

export function isValidOperatorInviteForEmail(token: string, email: string): boolean {
  const parsed = verifyOperatorCustomerInviteToken(token);
  if (!parsed) {
    return false;
  }
  return parsed.email === normalizeAccessEmail(email);
}
