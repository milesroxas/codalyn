import type { createAuthMiddleware } from "better-auth/api";
import type { cookies } from "next/headers";
import { resolveTowerCookieDomain } from "@/server/tower-hosts";
import {
  parseTowerAuthFlash,
  TOWER_AUTH_FLASH_COOKIE,
  TOWER_AUTH_FLASH_EMAIL_VERIFIED,
  type TowerAuthFlash,
} from "@/shared/lib/auth/tower-auth-flash";

/** One minute — enough for one redirect + client hydration. */
export const TOWER_AUTH_FLASH_COOKIE_MAX_AGE_SECONDS = 60;

type AuthMiddlewareContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

export function towerAuthFlashCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  maxAge: number;
  path: string;
  domain?: string;
} {
  const domain = resolveTowerCookieDomain();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOWER_AUTH_FLASH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

export function setTowerAuthFlashCookieInHook(ctx: AuthMiddlewareContext, flash: TowerAuthFlash): void {
  ctx.setCookie(TOWER_AUTH_FLASH_COOKIE, flash, towerAuthFlashCookieOptions());
}

export function setTowerEmailVerifiedFlashCookieInHook(ctx: AuthMiddlewareContext): void {
  setTowerAuthFlashCookieInHook(ctx, TOWER_AUTH_FLASH_EMAIL_VERIFIED);
}

export function readTowerAuthFlashCookie(cookieStore: Awaited<ReturnType<typeof cookies>>): TowerAuthFlash | null {
  return parseTowerAuthFlash(cookieStore.get(TOWER_AUTH_FLASH_COOKIE)?.value);
}

/** Read once per request and clear so the flash cannot be replayed. */
export function consumeTowerAuthFlashCookie(cookieStore: Awaited<ReturnType<typeof cookies>>): TowerAuthFlash | null {
  const flash = readTowerAuthFlashCookie(cookieStore);
  if (flash) {
    cookieStore.delete(TOWER_AUTH_FLASH_COOKIE);
  }
  return flash;
}
