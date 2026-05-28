import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";
import type { TowerAuthSurfaceHrefPath } from "@/shared/lib/navigation/tower-auth-surfaces";

export type { TowerAuthSurfaceHrefPath as TowerAuthSurfacePath } from "@/shared/lib/navigation/tower-auth-surfaces";

export function buildTowerAuthSurfaceHref(
  path: TowerAuthSurfaceHrefPath,
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
