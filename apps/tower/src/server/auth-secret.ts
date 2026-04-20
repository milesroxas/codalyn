/** Shared secret resolution for Better Auth and derived Designer credentials. */
export function resolveAuthSecret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (s) {
    return s;
  }
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET is required in production (Vercel).");
  }
  return "dev-only-dev-only-dev-only-dev-only-dev-only-00";
}
