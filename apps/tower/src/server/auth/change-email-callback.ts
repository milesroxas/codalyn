import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { TOWER_EMAIL_CHANGED_QUERY } from "@/shared/lib/auth/change-email-query";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";

export function resolveTowerEmailChangeCompleteAppCallbackUrl(path = "/account"): string {
  const base = resolveTowerPublicBaseUrl().replace(/\/$/, "");
  const safePath = sanitizeRelativePath(path);
  const url = new URL(safePath, `${base}/`);
  url.searchParams.set(TOWER_EMAIL_CHANGED_QUERY, "1");
  return url.toString();
}
