import { isProductAdminAppRole } from "@/shared/lib/membership/product-admin-role";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";

export function resolvePostAuthRedirectTarget(
  user: { role?: string | null } | null | undefined,
  callbackUrl: string
): string {
  const safeCallbackUrl = sanitizeRelativePath(callbackUrl);
  if (safeCallbackUrl !== "/") {
    return safeCallbackUrl;
  }
  return isProductAdminAppRole(user?.role ?? null) ? "/console" : safeCallbackUrl;
}
