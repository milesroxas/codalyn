import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/shared/lib/db";
import * as schema from "@/shared/lib/db/auth-schema";

function resolveAuthSecret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (s) {
    return s;
  }
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET is required in production (Vercel).");
  }
  // Dev / local builds only — set a real secret in .env.local before shipping.
  return "dev-only-dev-only-dev-only-dev-only-dev-only-00";
}

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: resolveAuthSecret(),
  baseURL,
  trustedOrigins: [baseURL],
  plugins: [nextCookies()],
});
