import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, bearer } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import {
  assertEmailMaySignUp,
  assertUserMaySignInByEmail,
  grantEarlyAccess,
  readOperatorInviteTokenFromAuthContext,
} from "@/server/access/early-access";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { resolveTowerEmailChangeCompleteAppCallbackUrl } from "@/server/auth/change-email-callback";
import {
  isChangeEmailVerificationRequest,
  rewriteBetterAuthVerifyEmailUrlToAppPage,
  rewriteVerifyEmailCallbackUrl,
} from "@/server/auth/email-verification-token";
import { resolveAuthSecret } from "@/server/auth-secret";
import { sendChangeEmailConfirmationEmail } from "@/server/email/change-email-confirmation-email";
import { sendChangeEmailNewAddressVerificationEmail } from "@/server/email/change-email-new-address-email";
import { sendEmailVerificationEmail } from "@/server/email/email-verification-email";
import { sendPasswordResetEmail } from "@/server/email/password-reset-email";
import { towerOrganization } from "@/server/membership/tower-organization";
import {
  prepareUserAccountDeletion,
  toUserAccountDeletionApiError,
  UserAccountDeletionBlockedError,
} from "@/server/membership/user-account-deletion";
import { resolveTowerCookieDomain } from "@/server/tower-hosts";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { resolveTowerTrustedOrigins } from "@/server/tower-trusted-origins";
import { TOWER_SKIP_VERIFICATION_EMAIL_HEADER } from "@/shared/lib/auth/tower-email-verification-header";
import { db } from "@/shared/lib/db";
import * as schema from "@/shared/lib/db/auth-schema";

const baseURL = resolveTowerPublicBaseUrl();

function resolveAdvancedAuthOptions(): {
  crossSubDomainCookies?: { enabled: true; domain: string };
} {
  const cookieDomain = resolveTowerCookieDomain();
  if (!cookieDomain) {
    return {};
  }
  return {
    crossSubDomainCookies: {
      enabled: true,
      domain: cookieDomain,
    },
  };
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
    sendResetPassword: async ({ user, url }) => {
      void sendPasswordResetEmail({
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
      const skipHeader = request?.headers.get(TOWER_SKIP_VERIFICATION_EMAIL_HEADER) === "1";
      const changeEmailVerification = isChangeEmailVerificationRequest(token);
      if (skipHeader && !changeEmailVerification) {
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
        void sendChangeEmailConfirmationEmail({
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
        await assertUserMaySignInByEmail(email);
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
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
