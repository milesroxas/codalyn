/**
 * Client-side allowlist for server-driven redirects (Webflow Marketplace review): a Better Auth
 * response carrying `redirect: true` may only navigate to the Tower backend this bundle was built
 * against or Webflow's OAuth consent screen. Any other destination is dropped on the client, so a
 * compromised or misconfigured backend response cannot send the extension anywhere else.
 */
export function isTrustedRedirectUrl(raw: unknown, towerOrigin: string): boolean {
  if (typeof raw !== "string" || raw.length === 0) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (towerOrigin) {
    try {
      if (url.origin === new URL(towerOrigin).origin) {
        return true;
      }
    } catch {
      /* misconfigured Tower origin — fall through to the Webflow OAuth check */
    }
  }
  return url.protocol === "https:" && url.hostname === "webflow.com" && url.pathname === "/oauth/authorize";
}
