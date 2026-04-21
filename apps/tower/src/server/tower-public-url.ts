/**
 * Canonical HTTPS origin for Tower (Better Auth `baseURL`, absolute links in transactional email).
 *
 * Prefer explicit env on custom domains. On Vercel, `VERCEL_URL` is set per deployment when
 * `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` are not.
 */
export function resolveTowerPublicBaseUrl(): string {
  const primary = (process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (primary) {
    return primary.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  if (process.env.VERCEL_ENV === "production") {
    throw new Error(
      "Set BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL to your production Tower URL (custom domain or Vercel URL)."
    );
  }
  return "http://localhost:3100";
}
