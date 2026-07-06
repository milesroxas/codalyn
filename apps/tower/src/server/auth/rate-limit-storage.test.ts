import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveTowerAuthRateLimitStorage } from "./rate-limit-storage";

describe("resolveTowerAuthRateLimitStorage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to memory (safe to deploy before migration)", () => {
    vi.stubEnv("TOWER_AUTH_RATELIMIT_DB_STORAGE", "");
    expect(resolveTowerAuthRateLimitStorage()).toBe("memory");
  });

  it("uses database only when explicitly opted in", () => {
    vi.stubEnv("TOWER_AUTH_RATELIMIT_DB_STORAGE", "1");
    expect(resolveTowerAuthRateLimitStorage()).toBe("database");
  });

  it("treats any non-1 value as memory", () => {
    vi.stubEnv("TOWER_AUTH_RATELIMIT_DB_STORAGE", "true");
    expect(resolveTowerAuthRateLimitStorage()).toBe("memory");
  });
});
