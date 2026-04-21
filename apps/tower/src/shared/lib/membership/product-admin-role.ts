/**
 * Whether the Better Auth app `user.role` grants SaaS product admin (admin plugin APIs).
 * Roles may be comma-separated per Better Auth admin plugin.
 */
export function isProductAdminAppRole(role: string | null | undefined): boolean {
  if (!role) {
    return false;
  }
  return role
    .split(",")
    .map((r) => r.trim())
    .includes("product_admin");
}
