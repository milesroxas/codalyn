import { isProductAdminAppRole } from "@/shared/lib/membership/product-admin-role";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";
import { isTowerAuthSurfacePath } from "@/shared/lib/navigation/tower-auth-surfaces";

function shouldSendProductAdminToOperatorConsole(callbackUrl: string): boolean {
  return callbackUrl === "/" || isTowerAuthSurfacePath(callbackUrl);
}

export function resolvePostAuthRedirectTarget(
  user: { role?: string | null } | null | undefined,
  callbackUrl: string
): string {
  const safeCallbackUrl = sanitizeRelativePath(callbackUrl);
  if (isProductAdminAppRole(user?.role ?? null) && shouldSendProductAdminToOperatorConsole(safeCallbackUrl)) {
    return "/console";
  }
  return safeCallbackUrl;
}
