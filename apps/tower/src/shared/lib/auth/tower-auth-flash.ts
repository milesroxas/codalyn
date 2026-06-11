export const TOWER_AUTH_FLASH_COOKIE = "tower_auth_flash";

/** Short-lived post-auth flash values stored in an httpOnly cookie (not URL query params). */
export const TOWER_AUTH_FLASH_EMAIL_VERIFIED = "email_verified" as const;

export type TowerAuthFlash = typeof TOWER_AUTH_FLASH_EMAIL_VERIFIED;

const TOWER_AUTH_FLASH_VALUES = new Set<string>([TOWER_AUTH_FLASH_EMAIL_VERIFIED]);

export function parseTowerAuthFlash(value: string | undefined | null): TowerAuthFlash | null {
  if (!value || !TOWER_AUTH_FLASH_VALUES.has(value)) {
    return null;
  }
  return value as TowerAuthFlash;
}
