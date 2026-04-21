import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, bearer } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { resolveAuthSecret } from "@/server/auth-secret";
import { towerOrganization } from "@/server/membership/tower-organization";
import { db } from "@/shared/lib/db";
import * as schema from "@/shared/lib/db/auth-schema";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3100";

/** Beacon extension + local dev; keep in sync with `middleware` CORS defaults + env extras. */
const defaultTrustedOrigins = [
  "http://localhost:1337",
  "http://127.0.0.1:1337",
  "http://localhost:3100",
  "https://69e2b49536eded7411b48cf6.webflow-ext.com",
] as const;

function resolveTrustedOrigins(): string[] {
  const fromEnv = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? process.env.TOWER_CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([baseURL, ...defaultTrustedOrigins, ...fromEnv])];
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
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
    },
  },
  secret: resolveAuthSecret(),
  baseURL,
  trustedOrigins: resolveTrustedOrigins(),
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
