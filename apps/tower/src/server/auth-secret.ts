/** Shared secret resolution for Better Auth and derived Designer credentials. */
export function resolveAuthSecret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (s) {
    return s;
  }
  // Any Vercel environment (preview OR production) is internet-reachable. Falling back to a
  // source-visible constant there would let anyone forge HMAC-signed invite tokens (mint valid
  // invites for arbitrary emails → self-grant access + canCreateOrganization). The constant is only
  // permitted on a local dev machine, where VERCEL_ENV is unset.
  if (process.env.VERCEL_ENV) {
    throw new Error("BETTER_AUTH_SECRET is required in all Vercel environments (preview and production).");
  }
  return "dev-only-dev-only-dev-only-dev-only-dev-only-00";
}
