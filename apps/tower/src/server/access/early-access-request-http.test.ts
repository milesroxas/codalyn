import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleEarlyAccessRequestPost } from "@/server/access/early-access-request-http";
import { RateLimitError } from "@/server/security/rate-limit";

vi.mock("@/server/access/early-access-feature", () => ({
  isTowerEarlyAccessGateEnabled: vi.fn(() => true),
}));

vi.mock("@/server/access/early-access-request", () => ({
  submitEarlyAccessRequest: vi.fn(async () => "created"),
}));

vi.mock("@/server/security/early-access-rate-limit", () => ({
  assertEarlyAccessEmailRateLimit: vi.fn(async () => undefined),
  assertEarlyAccessIpRateLimit: vi.fn(async () => undefined),
  assertBeaconEarlyAccessIpRateLimit: vi.fn(async () => undefined),
}));

import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { submitEarlyAccessRequest } from "@/server/access/early-access-request";
import { assertEarlyAccessEmailRateLimit } from "@/server/security/early-access-rate-limit";

function postRequest(body: unknown): Request {
  return new Request("http://tower.test/api/account/request-early-access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = { email: "user@example.com", referralSource: "youtube" };

const allowIp = async () => undefined;

describe("handleEarlyAccessRequestPost", () => {
  beforeEach(() => {
    vi.mocked(isTowerEarlyAccessGateEnabled).mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns 404 when the gate is disabled", async () => {
    vi.mocked(isTowerEarlyAccessGateEnabled).mockReturnValue(false);
    const res = await handleEarlyAccessRequestPost(postRequest(VALID_BODY), {
      assertIpRateLimit: allowIp,
      requireTurnstile: false,
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_available" });
  });

  it("returns 429 before reading the body when the IP budget is exhausted", async () => {
    const res = await handleEarlyAccessRequestPost(postRequest(VALID_BODY), {
      assertIpRateLimit: async () => {
        throw new RateLimitError();
      },
      requireTurnstile: false,
    });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "rate_limited" });
    expect(submitEarlyAccessRequest).not.toHaveBeenCalled();
  });

  it("rejects a missing Turnstile token when captcha is enforced and configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await handleEarlyAccessRequestPost(postRequest(VALID_BODY), {
      assertIpRateLimit: allowIp,
      requireTurnstile: true,
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "captcha_failed" });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(submitEarlyAccessRequest).not.toHaveBeenCalled();
  });

  it("accepts a valid Turnstile token when captcha is enforced", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }))
    );
    const res = await handleEarlyAccessRequestPost(postRequest({ ...VALID_BODY, turnstileToken: "tok" }), {
      assertIpRateLimit: allowIp,
      requireTurnstile: true,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, outcome: "created" });
  });

  it("skips Turnstile entirely for captcha-less surfaces even when configured (Beacon)", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await handleEarlyAccessRequestPost(postRequest(VALID_BODY), {
      assertIpRateLimit: allowIp,
      requireTurnstile: false,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, outcome: "created" });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(submitEarlyAccessRequest).toHaveBeenCalledWith(expect.objectContaining({ email: "user@example.com" }));
  });

  it("fails open without a token when Turnstile is enforced but not configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const res = await handleEarlyAccessRequestPost(postRequest(VALID_BODY), {
      assertIpRateLimit: allowIp,
      requireTurnstile: true,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, outcome: "created" });
  });

  it("rejects an invalid email with 400", async () => {
    const res = await handleEarlyAccessRequestPost(postRequest({ ...VALID_BODY, email: "not-an-email" }), {
      assertIpRateLimit: allowIp,
      requireTurnstile: false,
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_email" });
    expect(submitEarlyAccessRequest).not.toHaveBeenCalled();
  });

  it("returns 429 when the per-email budget is exhausted", async () => {
    vi.mocked(assertEarlyAccessEmailRateLimit).mockRejectedValueOnce(new RateLimitError());
    const res = await handleEarlyAccessRequestPost(postRequest(VALID_BODY), {
      assertIpRateLimit: allowIp,
      requireTurnstile: false,
    });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "rate_limited" });
    expect(submitEarlyAccessRequest).not.toHaveBeenCalled();
  });
});
