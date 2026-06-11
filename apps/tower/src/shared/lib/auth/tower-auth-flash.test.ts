import { describe, expect, it } from "vitest";
import { parseTowerAuthFlash, TOWER_AUTH_FLASH_EMAIL_VERIFIED } from "@/shared/lib/auth/tower-auth-flash";

describe("parseTowerAuthFlash", () => {
  it("accepts known flash values only", () => {
    expect(parseTowerAuthFlash(TOWER_AUTH_FLASH_EMAIL_VERIFIED)).toBe(TOWER_AUTH_FLASH_EMAIL_VERIFIED);
    expect(parseTowerAuthFlash("unknown")).toBeNull();
    expect(parseTowerAuthFlash(null)).toBeNull();
  });
});
