import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAuthSecret } from "./auth-secret";

describe("resolveAuthSecret", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the configured secret when set", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "real-secret");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(resolveAuthSecret()).toBe("real-secret");
  });

  it("throws in production when the secret is missing", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(() => resolveAuthSecret()).toThrow(/BETTER_AUTH_SECRET is required/);
  });

  it("throws in preview when the secret is missing (forgeable-token guard)", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(() => resolveAuthSecret()).toThrow(/BETTER_AUTH_SECRET is required/);
  });

  it("throws in any other Vercel environment when the secret is missing", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("VERCEL_ENV", "development");
    expect(() => resolveAuthSecret()).toThrow(/BETTER_AUTH_SECRET is required/);
  });

  it("falls back to the dev constant only on a local machine (no VERCEL_ENV)", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("VERCEL_ENV", "");
    expect(resolveAuthSecret()).toBe("dev-only-dev-only-dev-only-dev-only-dev-only-00");
  });
});
