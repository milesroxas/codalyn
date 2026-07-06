import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, bearer, oneTimeToken } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import {
  assertEmailMaySignUp,
  assertUserMaySignInByEmail,
  grantEarlyAccess,
  readOperatorInviteTokenFromAuthContext,
} from "@/server/access/early-access";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { isValidOperatorInviteForEmail } from "@/server/access/operator-invite-email-trust";
import { resolveTowerEmailChangeCompleteAppCallbackUrl } from "@/server/auth/change-email-callback";
import {
  isChangeEmailVerificationRequest,
  rewriteBetterAuthVerifyEmailUrlToAppPage,
  rewriteVerifyEmailCallbackUrl,
} from "@/server/auth/email-verification-token";
import { setTowerEmailVerifiedFlashCookieInHook } from "@/server/auth/tower-auth-flash-cookie";
import { shouldSetTowerEmailVerifiedFlashAfterVerifyEmail } from "@/server/auth/tower-email-verification-after-hook";
import { resolveAuthSecret } from "@/server/auth-secret";
import { sendChangeEmailConfirmationEmail } from "@/server/email/change-email-confirmation-email";
import { sendChangeEmailNewAddressVerificationEmail } from "@/server/email/change-email-new-address-email";
import { sendEmailVerificationEmail } from "@/server/email/email-verification-email";
import { sendExistingAccountSignUpEmail } from "@/server/email/existing-account-sign-up-email";
import { sendPasswordResetEmail } from "@/server/email/password-reset-email";
import { towerOrganization } from "@/server/membership/tower-organization";
import {
  prepareUserAccountDeletion,
  toUserAccountDeletionApiError,
  UserAccountDeletionBlockedError,
} from "@/server/membership/user-account-deletion";
import { resolveTowerCookieDomain, resolveTowerCookiePrefix } from "@/server/tower-hosts";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { resolveTowerTrustedOrigins } from "@/server/tower-trusted-origins";
import { db } from "@/shared/lib/db";
import * as schema from "@/shared/lib/db/auth-schema";

const baseURL = resolveTowerPublicBaseUrl();

function resolveAdvancedAuthOptions(): {
  crossSubDomainCookies?: { enabled: true; domain: string };
  cookiePrefix?: string;
} {
  const options: { crossSubDomainCookies?: { enabled: true; domain: string }; cookiePrefix?: string } = {};
  const cookieDomain = resolveTowerCookieDomain();
  if (cookieDomain) {
    options.crossSubDomainCookies = { enabled: true, domain: cookieDomain };
  }
  // Namespace prod vs preview cookies so a session minted on one Neon branch can't be read by the
  // other when both share the `codalyn.app` cookie domain. See resolveTowerCookiePrefix.
  const cookiePrefix = resolveTowerCookiePrefix();
  if (cookiePrefix) {
    options.cookiePrefix = cookiePrefix;
  }
  return options;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    // Sign-up with an existing email returns a synthetic "check your email" success (enumeration
    // protection), so route the real account holder to sign-in via email instead of leaving them
    // waiting for a verification link that never arrives.
    onExistingUserSignUp: async ({ user }) => {
      await sendExistingAccountSignUpEmail({
        user: { email: user.email, name: user.name },
      });
    },
    sendResetPassword: async ({ user, url }) => {
      // Must await: on Vercel the function can freeze after returning, so a fire-and-forget send may
      // never reach Resend and the reset email silently never arrives.
      await sendPasswordResetEmail({
        user: { email: user.email, name: user.name },
        url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }, request) => {
      const changeEmailVerification = isChangeEmailVerificationRequest(token);
      // Only an operator-issued invite token (HMAC-signed by a product admin, emailed to this exact
      // address, non-forgeable) proves inbox ownership at sign-up, so only it may suppress the
      // verification email. Team invitations are NOT trusted here: any user can invite an arbitrary
      // email to their own workspace, so possession of the invitation is not proof the sign-up owns
      // that inbox — those users verify their email normally, then accept the invitation.
      const operatorInviteToken = readOperatorInviteTokenFromAuthContext({ request });
      const skipForOperatorInvite = operatorInviteToken
        ? isValidOperatorInviteForEmail(operatorInviteToken, user.email)
        : false;
      if (skipForOperatorInvite && !changeEmailVerification) {
        return;
      }
      if (changeEmailVerification) {
        const verifyUrl = rewriteVerifyEmailCallbackUrl(url, resolveTowerEmailChangeCompleteAppCallbackUrl("/account"));
        await sendChangeEmailNewAddressVerificationEmail({
          user: { email: user.email, name: user.name },
          url: verifyUrl,
        });
        return;
      }
      await sendEmailVerificationEmail({
        user: { email: user.email, name: user.name },
        url: rewriteBetterAuthVerifyEmailUrlToAppPage(url),
      });
    },
  },
  user: {
    additionalFields: {
      firstName: {
        type: "string",
        required: false,
        input: true,
      },
      lastName: {
        type: "string",
        required: false,
        input: true,
      },
      webflowAuthorizedUserId: {
        type: "string",
        required: false,
        input: false,
      },
      canCreateOrganization: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      preferredOrganizationId: {
        type: "string",
        required: false,
        input: false,
      },
    },
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: false,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        // Await so the confirmation actually sends before the serverless function can freeze.
        await sendChangeEmailConfirmationEmail({
          user: { email: user.email, name: user.name },
          newEmail,
          url,
        });
      },
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        try {
          await prepareUserAccountDeletion(user.id);
        } catch (error) {
          if (error instanceof UserAccountDeletionBlockedError) {
            throw toUserAccountDeletionApiError(error);
          }
          throw error;
        }
      },
    },
  },
  secret: resolveAuthSecret(),
  baseURL,
  trustedOrigins: resolveTowerTrustedOrigins(),
  advanced: resolveAdvancedAuthOptions(),
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const email = typeof ctx.body?.email === "string" ? ctx.body.email : "";
        const inviteToken = readOperatorInviteTokenFromAuthContext(ctx);
        await assertEmailMaySignUp(email, inviteToken);
        return;
      }
      if (ctx.path === "/sign-in/email") {
        const email = typeof ctx.body?.email === "string" ? ctx.body.email : "";
        // Only gate sign-in here — no email-verification side effects. Marking a victim's account
        // verified before the password is even checked let a wrong-password attempt flip
        // `emailVerified`. Unverified users (invited or not) re-trigger the verification email via
        // `sendOnSignIn` and verify normally.
        await assertUserMaySignInByEmail(email);
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const token = typeof ctx.query?.token === "string" ? ctx.query.token : null;
      const redirectLocation = ctx.context.responseHeaders?.get("location") ?? null;
      if (
        shouldSetTowerEmailVerifiedFlashAfterVerifyEmail({
          path: ctx.path,
          token,
          redirectLocation,
        })
      ) {
        setTowerEmailVerifiedFlashCookieInHook(ctx);
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (createdUser, ctx) => {
          if (!createdUser.email) {
            return;
          }
          // Auto-verify at sign-up ONLY for a valid operator invite token (admin-signed, bound to
          // this exact email, non-forgeable). Team-invitation possession is deliberately NOT trusted:
          // an attacker can invite any email to their own workspace and would otherwise mint a
          // verified account under the victim's identity. Team-invited users verify their email
          // normally; genuine ownership is (re)confirmed in `beforeAcceptInvitation`.
          const operatorInviteToken = readOperatorInviteTokenFromAuthContext(ctx);
          if (operatorInviteToken && isValidOperatorInviteForEmail(operatorInviteToken, createdUser.email)) {
            return {
              data: {
                ...createdUser,
                emailVerified: true,
              },
            };
          }
        },
        after: async (createdUser) => {
          if (!isTowerEarlyAccessGateEnabled()) {
            return;
          }
          await grantEarlyAccess(createdUser.id);
        },
      },
    },
  },
  plugins: [
    nextCookies(),
    bearer(),
    /**
     * Single-use session handoff for the Beacon Designer extension: Beacon authenticates Tower with
     * a cross-origin bearer token, so it mints a one-time token to bootstrap a first-party cookie
     * session when opening Tower in a browser tab (see `/api/beacon-handoff`). Tokens are hashed at
     * rest, single-use, and expire in one minute; they never carry the session value.
     */
    oneTimeToken({
      storeToken: "hashed",
      expiresIn: 1,
    }),
    towerOrganization,
    admin({
      defaultRole: "user",
      /** Only this app role may use admin plugin APIs (list users, etc.). Do not register a generic `admin` role. */
      adminRoles: ["product_admin"],
      roles: {
        user: userAc,
        product_admin: adminAc,
      },
    }),
  ],
});
