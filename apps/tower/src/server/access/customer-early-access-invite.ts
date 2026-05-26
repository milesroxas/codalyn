import { eq, sql } from "drizzle-orm";
import { grantEarlyAccess, normalizeAccessEmail } from "@/server/access/early-access";
import {
  buildEarlyAccessSignUpUrl,
  sendEarlyAccessApprovedExistingUserEmail,
  sendEarlyAccessApprovedNewUserEmail,
} from "@/server/email/early-access-approved-email";
import {
  sendOperatorExistingUserTeamEligibleEmail,
  sendOperatorNewCustomerInviteEmail,
} from "@/server/email/operator-customer-invite-email";
import { signOperatorCustomerInviteToken } from "@/server/operator-customer-invite-token";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

export type CustomerEarlyAccessInviteResult = { kind: "existing_user" } | { kind: "new_user"; inviteUrl: string };

export type CustomerEarlyAccessInviteReason = "operator_invite" | "early_access_request";

/**
 * Operator approval path: grant early access and send the same invite email/link used by Console → Invite customer.
 * Access truth remains `user.early_access_granted_at` + signed invite tokens for new sign-ups.
 */
export async function inviteCustomerForEarlyAccess(
  email: string,
  inviterLabel: string,
  reason: CustomerEarlyAccessInviteReason = "operator_invite"
): Promise<CustomerEarlyAccessInviteResult> {
  const normalized = normalizeAccessEmail(email);
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.email}) = ${normalized}`)
    .limit(1);

  if (existing) {
    await db.update(user).set({ canCreateOrganization: true }).where(eq(user.id, existing.id));
    await grantEarlyAccess(existing.id);
    if (reason === "early_access_request") {
      await sendEarlyAccessApprovedExistingUserEmail({ email: normalized });
    } else {
      await sendOperatorExistingUserTeamEligibleEmail({
        email: normalized,
        inviterLabel,
      });
    }
    return { kind: "existing_user" };
  }

  const token = signOperatorCustomerInviteToken(normalized);
  const inviteUrl = buildEarlyAccessSignUpUrl(token);
  if (reason === "early_access_request") {
    await sendEarlyAccessApprovedNewUserEmail({
      email: normalized,
      inviteUrl,
    });
  } else {
    await sendOperatorNewCustomerInviteEmail({
      email: normalized,
      inviteUrl,
      inviterLabel,
    });
  }
  return { kind: "new_user", inviteUrl };
}
