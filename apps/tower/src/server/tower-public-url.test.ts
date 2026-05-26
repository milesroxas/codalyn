import { afterEach, describe, expect, it } from "vitest";

import { resolveTowerAbsoluteUrl, resolveTowerPublicBaseUrl } from "./tower-public-url";

describe("tower-public-url", () => {
  const envKeys = ["BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL", "VERCEL_URL", "VERCEL_ENV"] as const;
  const prev: Partial<Record<(typeof envKeys)[number], string | undefined>> = {};

  afterEach(() => {
    for (const key of envKeys) {
      if (prev[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prev[key];
      }
    }
  });

  function stubEnv(key: (typeof envKeys)[number], value: string | undefined) {
    if (!(key in prev)) {
      prev[key] = process.env[key];
    }
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  it("resolveTowerPublicBaseUrl prefers BETTER_AUTH_URL", () => {
    stubEnv("BETTER_AUTH_URL", "https://tower.example.com/");
    stubEnv("NEXT_PUBLIC_APP_URL", "https://other.example.com");
    stubEnv("VERCEL_URL", undefined);
    expect(resolveTowerPublicBaseUrl()).toBe("https://tower.example.com");
  });

  it("resolveTowerPublicBaseUrl falls back to VERCEL_URL", () => {
    stubEnv("BETTER_AUTH_URL", undefined);
    stubEnv("NEXT_PUBLIC_APP_URL", undefined);
    stubEnv("VERCEL_URL", "tower-preview.vercel.app");
    expect(resolveTowerPublicBaseUrl()).toBe("https://tower-preview.vercel.app");
  });

  it("resolveTowerAbsoluteUrl keeps absolute URLs", () => {
    stubEnv("BETTER_AUTH_URL", "https://tower.example.com");
    expect(resolveTowerAbsoluteUrl("https://auth.example.com/callback")).toBe("https://auth.example.com/callback");
  });

  it("resolveTowerAbsoluteUrl prefixes relative paths with the public base", () => {
    stubEnv("BETTER_AUTH_URL", "https://tower.example.com");
    expect(resolveTowerAbsoluteUrl("/sign-in")).toBe("https://tower.example.com/sign-in");
    expect(resolveTowerAbsoluteUrl("sign-up?invite=abc")).toBe("https://tower.example.com/sign-up?invite=abc");
  });
});
