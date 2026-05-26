import { describe, expect, it } from "vitest";
import { isRateLimitWindowExpired } from "@/server/security/destructive-action-rate-limit";

describe("isRateLimitWindowExpired", () => {
  it("expires after the configured window", () => {
    const started = new Date("2026-01-01T00:00:00.000Z");
    const beforeExpiry = new Date("2026-01-01T00:04:59.000Z");
    const afterExpiry = new Date("2026-01-01T00:05:00.000Z");

    expect(isRateLimitWindowExpired(started, 300, beforeExpiry)).toBe(false);
    expect(isRateLimitWindowExpired(started, 300, afterExpiry)).toBe(true);
  });
});
