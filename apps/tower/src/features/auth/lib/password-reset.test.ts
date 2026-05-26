import { describe, expect, it } from "vitest";
import {
  isInvalidPasswordResetToken,
  PASSWORD_RESET_QUERY,
  readPasswordResetSuccess,
  readPasswordResetToken,
} from "@/features/auth/lib/password-reset";

describe("readPasswordResetToken", () => {
  it("returns trimmed token when present", () => {
    expect(readPasswordResetToken(new URLSearchParams("token=abc123"))).toBe("abc123");
  });

  it("returns null for missing or blank token", () => {
    expect(readPasswordResetToken(new URLSearchParams(""))).toBeNull();
    expect(readPasswordResetToken(new URLSearchParams("token="))).toBeNull();
    expect(readPasswordResetToken(new URLSearchParams("token=%20%20"))).toBeNull();
  });
});

describe("isInvalidPasswordResetToken", () => {
  it("detects INVALID_TOKEN error", () => {
    expect(isInvalidPasswordResetToken(new URLSearchParams("error=INVALID_TOKEN"))).toBe(true);
  });

  it("returns false for other errors or no error", () => {
    expect(isInvalidPasswordResetToken(new URLSearchParams(""))).toBe(false);
    expect(isInvalidPasswordResetToken(new URLSearchParams("error=OTHER"))).toBe(false);
  });
});

describe("readPasswordResetSuccess", () => {
  it("reads success query flag", () => {
    expect(readPasswordResetSuccess(new URLSearchParams(`${PASSWORD_RESET_QUERY}=1`))).toBe(true);
  });

  it("returns false when flag is missing or not 1", () => {
    expect(readPasswordResetSuccess(new URLSearchParams(""))).toBe(false);
    expect(readPasswordResetSuccess(new URLSearchParams(`${PASSWORD_RESET_QUERY}=0`))).toBe(false);
  });
});
