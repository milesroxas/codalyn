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
import { resolveAuthSecret } from "@/server/auth-secret";
import { sendChangeEmailConfirmationEmail } from "@/server/email/change-email-confirmation-email";
import { sendEmailVerificationEmail } from "@/server/email/email-verification-email";
import { towerOrganization } from "@/server/membership/tower-organization";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { TOWER_STATIC_BEACON_RELATED_ORIGINS } from "@/server/tower-static-beacon-origins";
import { db } from "@/shared/lib/db";
import * as schema from "@/shared/lib/db/auth-schema";

const baseURL = resolveTowerPublicBaseUrl();

function resolveTrustedOrigins(): string[] {
  const fromEnv = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? process.env.TOWER_CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([baseURL, ...TOWER_STATIC_BEACON_RELATED_ORIGINS, ...fromEnv])];
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmailVerificationEmail({
        user: { email: user.email, name: user.name },
        url,
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
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        await sendChangeEmailConfirmationEmail({
          user: { email: user.email, name: user.name },
          newEmail,
          url,
        });
      },
    },
    deleteUser: {
      enabled: true,
    },
  },
  secret: resolveAuthSecret(),
  baseURL,
  trustedOrigins: resolveTrustedOrigins(),
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
