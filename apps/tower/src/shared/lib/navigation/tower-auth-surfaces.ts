import { TEAM_INVITATION_ACCEPT_PATH } from "@/shared/lib/membership/team-invitation-accept";

export const TOWER_AUTH_SURFACE_HREF_PATHS = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/request-access",
] as const;

export type TowerAuthSurfaceHrefPath = (typeof TOWER_AUTH_SURFACE_HREF_PATHS)[number];

export const TOWER_AUTH_SURFACE_PATHS = [
  ...TOWER_AUTH_SURFACE_HREF_PATHS,
  "/verify-email",
  TEAM_INVITATION_ACCEPT_PATH,
] as const;

export type TowerAuthSurfacePath = (typeof TOWER_AUTH_SURFACE_PATHS)[number];

export function isTowerAuthSurfacePath(pathname: string): boolean {
  const normalized = pathname === "" ? "/" : pathname;
  for (const path of TOWER_AUTH_SURFACE_PATHS) {
    if (normalized === path || normalized.startsWith(`${path}/`)) {
      return true;
    }
  }
  return false;
}

export function isTowerPublicLoggedOutSurface(pathname: string): boolean {
  const normalized = pathname === "" ? "/" : pathname;
  if (normalized === "/") {
    return true;
  }
  return isTowerAuthSurfacePath(normalized);
}
