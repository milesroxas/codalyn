import { isProductAdminAppRole } from "@/shared/lib/membership/product-admin-role";

/**
 * SaaS operator: Better Auth admin plugin role `product_admin` on `user.role` (DB / session).
 * Env email lists only affect `syncProductAdminRolesFromEnv` — they must not grant privileges at runtime
 * without a matching row, or they diverge from `hasPermission` and invite confused UX.
 * Team roles (`member.role`) are separate and live per organization.
 */
export function isTowerProductAdmin(user: unknown): boolean {
  if (!user || typeof user !== "object" || !("role" in user)) {
    return false;
  }
  return isProductAdminAppRole((user as { role?: string | null }).role);
}
