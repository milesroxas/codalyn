import { afterEach, describe, expect, it, vi } from "vitest";
import { resetTowerHostConfigCacheForTests } from "@/server/tower-hosts";
import { resolveTowerTrustedOrigins } from "@/server/tower-trusted-origins";

const ENV_KEYS = [
  "BETTER_AUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "BETTER_AUTH_TRUSTED_ORIGINS",
  "TOWER_CORS_ORIGINS",
  "TOWER_PREVIEW_APP_ORIGIN",
  "TOWER_HOST_SPLIT",
  "TOWER_MARKETING_URL",
  "VERCEL_URL",
  "VERCEL_BRANCH_URL",
  "VERCEL_ENV",
] as const;

afterEach(() => {
  vi.unstubAllEnvs();
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  resetTowerHostConfigCacheForTests();
});

describe("resolveTowerTrustedOrigins", () => {
  it("production includes base URL, marketing origin when host split is enabled, and static origins", () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://tower.codalyn.app");
    vi.stubEnv("VERCEL_ENV", "production");
    const origins = resolveTowerTrustedOrigins();
    expect(origins).toContain("https://tower.codalyn.app");
    expect(origins).toContain("https://codalyn.app");
    expect(origins).not.toContain("https://*.codalyn.app");
    expect(origins).not.toContain("https://*.vercel.app");
    expect(origins).not.toContain("https://tower-preview.codalyn.app");
  });

  it("preview includes explicit staging origin, marketing origin, and Vercel deployment hosts only", () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://tower.codalyn.app");
    vi.stubEnv("TOWER_MARKETING_URL", "https://preview.codalyn.app");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "codalyn-tower-git-main-acme.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "codalyn-tower-git-feature-acme.vercel.app");
    const origins = resolveTowerTrustedOrigins();
    expect(origins).toContain("https://tower-preview.codalyn.app");
    expect(origins).toContain("https://preview.codalyn.app");
    expect(origins).toContain("https://codalyn-tower-git-main-acme.vercel.app");
    expect(origins).toContain("https://codalyn-tower-git-feature-acme.vercel.app");
    expect(origins).not.toContain("https://*.codalyn.app");
    expect(origins).not.toContain("https://*.vercel.app");
  });

  it("preview honors TOWER_PREVIEW_APP_ORIGIN override", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("TOWER_PREVIEW_APP_ORIGIN", "https://staging.example.com");
    const origins = resolveTowerTrustedOrigins();
    expect(origins).toContain("https://staging.example.com");
    expect(origins).not.toContain("https://tower-preview.codalyn.app");
  });

  it("does not add preview origins for localhost dev", () => {
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3100");
    const origins = resolveTowerTrustedOrigins();
    expect(origins).not.toContain("https://tower-preview.codalyn.app");
    expect(origins).toContain("http://localhost:3100");
  });

  it("merges explicit env origins without duplicates", () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://tower.codalyn.app");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("BETTER_AUTH_TRUSTED_ORIGINS", "https://tower.codalyn.app,https://other.example.com");
    const origins = resolveTowerTrustedOrigins();
    expect(origins.filter((origin) => origin === "https://tower.codalyn.app")).toHaveLength(1);
    expect(origins).toContain("https://other.example.com");
  });
});
