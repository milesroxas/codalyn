import { describe, expect, it } from "vitest";
import { readEmailChangeSuccess } from "@/features/auth/lib/change-email";
import { TOWER_EMAIL_CHANGED_QUERY } from "@/shared/lib/auth/change-email-query";

describe("readEmailChangeSuccess", () => {
  it("reads email changed query flag", () => {
    expect(readEmailChangeSuccess(new URLSearchParams(`${TOWER_EMAIL_CHANGED_QUERY}=1`))).toBe(true);
    expect(readEmailChangeSuccess(new URLSearchParams(""))).toBe(false);
  });
});
