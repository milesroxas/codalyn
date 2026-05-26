import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";

export type TowerAuthSurfacePath = "/sign-in" | "/sign-up" | "/forgot-password" | "/reset-password";

export function buildTowerAuthSurfaceHref(
  path: TowerAuthSurfacePath,
  callbackPath: string,
  searchParams?: Record<string, string | null | undefined>
): string {
  const callbackUrl = sanitizeRelativePath(callbackPath);
  const params = new URLSearchParams({ callbackUrl });
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) {
        params.set(key, value);
      }
    }
  }
  return `${path}?${params.toString()}`;
}
