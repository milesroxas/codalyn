import { buildTowerAuthSurfaceHref } from "@/features/auth/lib/build-tower-auth-surface-href";

export function buildTowerSignInHref(
  callbackPath: string,
  searchParams?: Record<string, string | null | undefined>
): string {
  return buildTowerAuthSurfaceHref("/sign-in", callbackPath, searchParams);
}
