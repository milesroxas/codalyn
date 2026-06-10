import { afterEach, describe, expect, it } from "vitest";

import {
  buildMarketingMetadata,
  createMarketingPageMetadata,
  getMarketingPageCopy,
  resolveMarketingCanonicalUrl,
} from "@/server/marketing/marketing-seo";
import { resetTowerHostConfigCacheForTests } from "@/server/tower-hosts";

describe("marketing-seo", () => {
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

  it("resolves canonical URLs from marketing origins", () => {
    snapshotEnv();
    process.env.BETTER_AUTH_URL = "https://tower.codalyn.app";
    process.env.TOWER_MARKETING_URL = "https://codalyn.app";
    process.env.TOWER_FLINT_MARKETING_URL = "https://flint.codalyn.app";

    expect(resolveMarketingCanonicalUrl("home")).toBe("https://codalyn.app/");
    expect(resolveMarketingCanonicalUrl("tower")).toBe("https://codalyn.app/tower");
    expect(resolveMarketingCanonicalUrl("beacon")).toBe("https://codalyn.app/beacon");
    expect(resolveMarketingCanonicalUrl("flint")).toBe("https://flint.codalyn.app/");
    expect(resolveMarketingCanonicalUrl("privacy")).toBe("https://codalyn.app/privacy");
    expect(resolveMarketingCanonicalUrl("terms")).toBe("https://codalyn.app/terms");
  });

  it("formats product titles with the Codalyn suffix", () => {
    const metadata = buildMarketingMetadata({
      title: "Beacon",
      description: "Extending Webflow capabilities.",
      canonicalUrl: "https://codalyn.app/beacon",
    });

    expect(metadata.title).toBe("Beacon | Codalyn");
    expect(metadata.openGraph?.title).toBe("Beacon | Codalyn");
    expect(metadata.twitter?.title).toBe("Beacon | Codalyn");
  });

  it("keeps the home title un-suffixed", () => {
    const metadata = buildMarketingMetadata({
      title: "Codalyn",
      description: "Your Webflow workspace, unified.",
      canonicalUrl: "https://codalyn.app/",
    });

    expect(metadata.title).toBe("Codalyn");
  });

  it("includes canonical, open graph, twitter, and robots fields", () => {
    const metadata = createMarketingPageMetadata("flint");

    expect(metadata.alternates?.canonical).toBe("https://flint.codalyn.app/");
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      siteName: "Codalyn",
      locale: "en_US",
      url: "https://flint.codalyn.app/",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary",
    });
    expect(metadata.robots).toMatchObject({
      index: true,
      follow: true,
    });
  });

  it("reuses marketing copy as the single source of truth", () => {
    expect(getMarketingPageCopy("beacon").description).toContain("Webflow");
    expect(getMarketingPageCopy("flint").description).toContain("Lumos");
    expect(getMarketingPageCopy("privacy").title).toBe("Privacy Policy");
  });
});
