import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/marketing/flint-beta-group-request", () => ({
  submitFlintBetaGroupRequest: vi.fn(),
}));

vi.mock("@/server/security/rate-limit", () => ({
  RateLimitError: class RateLimitError extends Error {
    readonly code = "rate_limited" as const;
  },
}));

vi.mock("@/server/security/flint-beta-group-request-rate-limit", () => ({
  assertFlintBetaGroupRequestIpRateLimit: vi.fn(),
  assertFlintBetaGroupRequestEmailRateLimit: vi.fn(),
}));

import { submitFlintBetaGroupRequest } from "@/server/marketing/flint-beta-group-request";
import {
  assertFlintBetaGroupRequestEmailRateLimit,
  assertFlintBetaGroupRequestIpRateLimit,
} from "@/server/security/flint-beta-group-request-rate-limit";
import { RateLimitError } from "@/server/security/rate-limit";
import { POST } from "./route";

describe("POST /api/marketing/flint/beta-group-request", () => {
  beforeEach(() => {
    vi.mocked(submitFlintBetaGroupRequest).mockReset();
    vi.mocked(assertFlintBetaGroupRequestIpRateLimit).mockReset().mockResolvedValue(undefined);
    vi.mocked(assertFlintBetaGroupRequestEmailRateLimit).mockReset().mockResolvedValue(undefined);
  });

  it("returns 429 before reading the body when the source IP budget is exhausted", async () => {
    vi.mocked(assertFlintBetaGroupRequestIpRateLimit).mockRejectedValue(new RateLimitError());

    const res = await POST(
      new Request("http://localhost/api/marketing/flint/beta-group-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.9" },
        body: JSON.stringify({ email: "test@example.com" }),
      })
    );

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({ error: "rate_limited" });
    expect(assertFlintBetaGroupRequestIpRateLimit).toHaveBeenCalledWith("203.0.113.9");
    expect(submitFlintBetaGroupRequest).not.toHaveBeenCalled();
  });

  it("returns 429 and sends nothing when the target address budget is exhausted", async () => {
    vi.mocked(assertFlintBetaGroupRequestEmailRateLimit).mockRejectedValue(new RateLimitError());

    const res = await POST(
      new Request("http://localhost/api/marketing/flint/beta-group-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "victim@example.com" }),
      })
    );

    expect(res.status).toBe(429);
    expect(assertFlintBetaGroupRequestEmailRateLimit).toHaveBeenCalledWith("victim@example.com");
    expect(submitFlintBetaGroupRequest).not.toHaveBeenCalled();
  });

  it("returns created outcome", async () => {
    vi.mocked(submitFlintBetaGroupRequest).mockResolvedValue("created");

    const res = await POST(
      new Request("http://localhost/api/marketing/flint/beta-group-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", firstName: "Ada" }),
      })
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, outcome: "created" });
    expect(submitFlintBetaGroupRequest).toHaveBeenCalledWith({
      email: "test@example.com",
      firstName: "Ada",
      lastName: undefined,
    });
  });

  it("returns invalid_email for bad input", async () => {
    vi.mocked(submitFlintBetaGroupRequest).mockRejectedValue(new Error("invalid_email"));

    const res = await POST(
      new Request("http://localhost/api/marketing/flint/beta-group-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" }),
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "invalid_email" });
  });
});
