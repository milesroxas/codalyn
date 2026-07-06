import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertBeaconEarlyAccessIpRateLimit,
  assertEarlyAccessEmailRateLimit,
  assertEarlyAccessIpRateLimit,
} from "@/server/security/early-access-rate-limit";

vi.mock("@/server/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/security/rate-limit")>();
  return { ...actual, assertPostgresRateLimit: vi.fn(async () => undefined) };
});

import { assertPostgresRateLimit } from "@/server/security/rate-limit";

describe("early-access rate limit keys", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("namespaces the Tower IP budget under early-access:ip:", async () => {
    await assertEarlyAccessIpRateLimit("1.2.3.4");
    expect(assertPostgresRateLimit).toHaveBeenCalledWith("early-access:ip:1.2.3.4", expect.any(Object));
  });

  it("namespaces the Beacon IP budget separately and with a stricter budget than Tower's", async () => {
    await assertEarlyAccessIpRateLimit("1.2.3.4");
    await assertBeaconEarlyAccessIpRateLimit("1.2.3.4");
    const [, towerBudget] = vi.mocked(assertPostgresRateLimit).mock.calls[0];
    const [beaconKey, beaconBudget] = vi.mocked(assertPostgresRateLimit).mock.calls[1];
    expect(beaconKey).toBe("early-access:beacon:ip:1.2.3.4");
    expect(beaconBudget.maxAttempts).toBeLessThan(towerBudget.maxAttempts);
  });

  it("is a no-op for both IP budgets when no IP is available", async () => {
    await assertEarlyAccessIpRateLimit(null);
    await assertBeaconEarlyAccessIpRateLimit(null);
    expect(assertPostgresRateLimit).not.toHaveBeenCalled();
  });

  it("normalizes the email before keying so casing/whitespace variants share a budget", async () => {
    await assertEarlyAccessEmailRateLimit("  User@Example.COM  ");
    expect(assertPostgresRateLimit).toHaveBeenCalledWith("early-access:email:user@example.com", expect.any(Object));
  });
});
