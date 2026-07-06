import { afterEach, describe, expect, it, vi } from "vitest";
import { isTurnstileConfigured, verifyTurnstileToken } from "./verify-turnstile";

describe("verify-turnstile", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("is not configured without a secret", () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(isTurnstileConfigured()).toBe(false);
  });

  it("fails open (returns true) when captcha is not configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await verifyTurnstileToken(null, null)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a missing token when configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await verifyTurnstileToken(null, "1.2.3.4")).toBe(false);
    expect(await verifyTurnstileToken("", "1.2.3.4")).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns true only when siteverify reports success", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }))
    );
    expect(await verifyTurnstileToken("tok", "1.2.3.4")).toBe(true);
  });

  it("returns false when siteverify reports failure", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ success: false }), { status: 200 }))
    );
    expect(await verifyTurnstileToken("tok", null)).toBe(false);
  });

  it("fails closed on a network error", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );
    expect(await verifyTurnstileToken("tok", null)).toBe(false);
  });

  it("fails closed on a non-200 response", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 }))
    );
    expect(await verifyTurnstileToken("tok", null)).toBe(false);
  });
});
