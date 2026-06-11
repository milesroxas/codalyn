import { afterEach, describe, expect, it } from "vitest";

import {
  buildFlintMarketingUrl,
  buildMarketingUrl,
  buildTowerAppUrl,
  buildTowerLandingAppLinks,
  isAppHost,
  isFlintMarketingHost,
  isHostSplitEnabled,
  isMarketingHost,
  normalizeHostname,
  parentDomainForCookie,
  resetTowerHostConfigCacheForTests,
  resolveTowerCookieDomain,
  resolveTowerPublicFlintHref,
  sanitizeRelativePath,
} from "./tower-hosts";

describe("tower-hosts", () => {
  const envKeys = [
    "TOWER_HOST_SPLIT",
    "TOWER_MARKETING_HOSTS",
    "TOWER_FLINT_MARKETING_HOSTS",
    "TOWER_FLINT_MARKETING_URL",
    "TOWER_APP_HOST",
    "TOWER_MARKETING_URL",
    "TOWER_COOKIE_DOMAIN",
    "BETTER_AUTH_URL",
    "NEXT_PUBLIC_APP_URL",
    "VERCEL_ENV",
  ] as const;

  const prev: Partial<Record<(typeof envKeys)[number], string | undefined>> = {};

  afterEach(() => {
    for (const key of envKeys) {
      if (prev[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prev[key];
      }
    }
    resetTowerHostConfigCacheForTests();
  });

  function snapshotEnv(): void {
    for (const key of envKeys) {
      prev[key] = process.env[key];
    }
  }

  it("normalizes hostname with port", () => {
    expect(normalizeHostname("Codalyn.APP:443")).toBe("codalyn.app");
  });

  it("rejects protocol-relative redirect paths", () => {
    snapshotEnv();
    process.env.BETTER_AUTH_URL = "https://tower.codalyn.app";
    expect(sanitizeRelativePath("//evil.test/phish")).toBe("/");
    expect(buildTowerAppUrl("//evil.test/phish")).toBe("https://tower.codalyn.app/");
  });

  it("treats localhost as unified app host when split is enabled", () => {
    snapshotEnv();
    process.env.TOWER_HOST_SPLIT = "1";
    expect(isMarketingHost("localhost")).toBe(false);
    expect(isAppHost("localhost")).toBe(true);
  });

  it("detects marketing and app hosts when split is enabled", () => {
    snapshotEnv();
    process.env.TOWER_HOST_SPLIT = "1";
    process.env.BETTER_AUTH_URL = "https://tower.codalyn.app";
    expect(isMarketingHost("codalyn.app")).toBe(true);
    expect(isMarketingHost("www.codalyn.app")).toBe(true);
    expect(isMarketingHost("tower.codalyn.app")).toBe(false);
    expect(isAppHost("tower.codalyn.app")).toBe(true);
    expect(isAppHost("codalyn.app")).toBe(false);
  });

  it("auto-enables split when app URL uses tower subdomain", () => {
    snapshotEnv();
    process.env.BETTER_AUTH_URL = "https://tower.codalyn.app";
    expect(isHostSplitEnabled()).toBe(true);
  });

  it("auto-enables split when app URL uses tower-preview subdomain", () => {
    snapshotEnv();
    process.env.BETTER_AUTH_URL = "https://tower-preview.codalyn.app";
    expect(isHostSplitEnabled()).toBe(true);
    expect(isAppHost("tower-preview.codalyn.app")).toBe(true);
    expect(isMarketingHost("tower-preview.codalyn.app")).toBe(false);
  });

  it("builds app and marketing URLs from env", () => {
    snapshotEnv();
    process.env.BETTER_AUTH_URL = "https://tower.codalyn.app";
    process.env.TOWER_MARKETING_URL = "https://codalyn.app";
    expect(buildTowerAppUrl("/sign-in")).toBe("https://tower.codalyn.app/sign-in");
    expect(buildMarketingUrl("/")).toBe("https://codalyn.app/");
    expect(buildFlintMarketingUrl("/")).toBe("https://flint.codalyn.app/");
    expect(buildTowerLandingAppLinks("tower.codalyn.app").home).toBe("https://codalyn.app/");
    expect(buildTowerLandingAppLinks("tower.codalyn.app").tower).toBe("https://tower.codalyn.app/");
    expect(buildTowerLandingAppLinks("tower.codalyn.app").beacon).toBe("https://codalyn.app/beacon");
    expect(buildTowerLandingAppLinks("tower.codalyn.app").flint).toBe("https://flint.codalyn.app/");
    expect(buildTowerLandingAppLinks("codalyn.app").home).toBe("/");
    expect(buildTowerLandingAppLinks("codalyn.app").tower).toBe("/tower");
    expect(buildTowerLandingAppLinks("codalyn.app").beacon).toBe("/beacon");
    expect(buildTowerLandingAppLinks("codalyn.app").flint).toBe("/flint");
    expect(buildTowerLandingAppLinks("flint.codalyn.app").flint).toBe("/");
  });

  it("builds unified local tower product link", () => {
    snapshotEnv();
    process.env.TOWER_HOST_SPLIT = "0";
    process.env.BETTER_AUTH_URL = "http://localhost:3100";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3100";
    expect(buildTowerLandingAppLinks("localhost").tower).toBe("/tower");
  });

  it("detects flint marketing hosts when split is enabled", () => {
    snapshotEnv();
    process.env.TOWER_HOST_SPLIT = "1";
    process.env.BETTER_AUTH_URL = "https://tower-preview.codalyn.app";
    expect(isFlintMarketingHost("flint-preview.codalyn.app")).toBe(true);
    expect(isFlintMarketingHost("flint.codalyn.app")).toBe(true);
    expect(resolveTowerPublicFlintHref("tower-preview.codalyn.app")).toBe("https://flint-preview.codalyn.app/");
  });

  it("derives marketing origin from tower app URL when TOWER_MARKETING_URL is unset", () => {
    snapshotEnv();
    process.env.BETTER_AUTH_URL = "https://tower-preview.codalyn.app";
    expect(buildMarketingUrl("/")).toBe("https://preview.codalyn.app/");
  });

  it("derives parent cookie domain from app host", () => {
    expect(parentDomainForCookie("tower.codalyn.app")).toBe("codalyn.app");
    expect(parentDomainForCookie("localhost")).toBe(null);
  });

  it("returns cookie domain only in production and preview with a validated parent domain", () => {
    snapshotEnv();
    process.env.TOWER_HOST_SPLIT = "1";
    process.env.BETTER_AUTH_URL = "https://tower.codalyn.app";
    expect(resolveTowerCookieDomain()).toBeUndefined();

    process.env.VERCEL_ENV = "preview";
    expect(resolveTowerCookieDomain()).toBe("codalyn.app");

    process.env.VERCEL_ENV = "production";
    expect(resolveTowerCookieDomain()).toBe("codalyn.app");
  });

  it("rejects mismatched TOWER_COOKIE_DOMAIN override", () => {
    snapshotEnv();
    process.env.TOWER_HOST_SPLIT = "1";
    process.env.VERCEL_ENV = "production";
    process.env.BETTER_AUTH_URL = "https://tower.codalyn.app";
    process.env.TOWER_COOKIE_DOMAIN = "evil.test";
    expect(resolveTowerCookieDomain()).toBeUndefined();
  });
});
