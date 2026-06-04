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
import {
  isValidOperatorInviteForEmail,
  trustEmailForOperatorInvite,
} from "@/server/access/operator-invite-email-trust";
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
import {
  isPendingTeamInvitationForEmail,
  readTeamInvitationIdFromAuthContext,
  trustEmailForPendingTeamInvitation,
} from "@/server/membership/team-invitation-email-trust";
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
      const teamInvitationId = readTeamInvitationIdFromAuthContext({ request });
      const operatorInviteToken = readOperatorInviteTokenFromAuthContext({ request });
      const skipForTeamInvitation = teamInvitationId
        ? await isPendingTeamInvitationForEmail(teamInvitationId, user.email)
        : false;
      const skipForOperatorInvite = operatorInviteToken
        ? isValidOperatorInviteForEmail(operatorInviteToken, user.email)
        : false;
      if ((skipHeader || skipForTeamInvitation || skipForOperatorInvite) && !changeEmailVerification) {
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
        await trustEmailForPendingTeamInvitation(email, readTeamInvitationIdFromAuthContext(ctx));
        await trustEmailForOperatorInvite(email, readOperatorInviteTokenFromAuthContext(ctx));
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
          const invitationId = readTeamInvitationIdFromAuthContext(ctx);
          if (invitationId && (await isPendingTeamInvitationForEmail(invitationId, createdUser.email))) {
            return {
              data: {
                ...createdUser,
                emailVerified: true,
              },
            };
          }
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
