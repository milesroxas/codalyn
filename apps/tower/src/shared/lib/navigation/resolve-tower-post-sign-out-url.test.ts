import { afterEach, describe, expect, it } from "vitest";

import {
  resolveTowerMarketingOrigin,
  resolveTowerPostSignOutUrl,
  resolveTowerSignOutNavigationHref,
} from "./resolve-tower-post-sign-out-url";

describe("resolveTowerPostSignOutUrl", () => {
  const envKeys = [
    "TOWER_HOST_SPLIT",
    "TOWER_MARKETING_URL",
    "NEXT_PUBLIC_TOWER_MARKETING_URL",
    "NEXT_PUBLIC_APP_URL",
    "TOWER_APP_HOST",
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
  });

  function snapshotEnv(): void {
    for (const key of envKeys) {
      prev[key] = process.env[key];
    }
  }

  it("stays on the app origin for localhost", () => {
    snapshotEnv();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3100";
    expect(resolveTowerPostSignOutUrl({ hostname: "localhost" })).toBe("/");
  });

  it("sends tower app host sign-out to the marketing site", () => {
    snapshotEnv();
    process.env.NEXT_PUBLIC_APP_URL = "https://tower.codalyn.app";
    process.env.TOWER_MARKETING_URL = "https://codalyn.app";
    expect(resolveTowerPostSignOutUrl({ hostname: "tower.codalyn.app" })).toBe("https://codalyn.app/");
  });

  it("derives preview marketing origin when env omits TOWER_MARKETING_URL", () => {
    snapshotEnv();
    process.env.NEXT_PUBLIC_APP_URL = "https://tower-preview.codalyn.app";
    expect(resolveTowerMarketingOrigin()).toBe("https://preview.codalyn.app");
    expect(resolveTowerPostSignOutUrl({ hostname: "tower-preview.codalyn.app" })).toBe("https://preview.codalyn.app/");
  });

  it("keeps marketing host sign-out on the same site", () => {
    snapshotEnv();
    process.env.NEXT_PUBLIC_APP_URL = "https://tower.codalyn.app";
    process.env.TOWER_MARKETING_URL = "https://codalyn.app";
    expect(resolveTowerPostSignOutUrl({ hostname: "codalyn.app" })).toBe("/");
  });
});

describe("resolveTowerSignOutNavigationHref", () => {
  it("returns external destinations unchanged", () => {
    expect(resolveTowerSignOutNavigationHref("https://codalyn.app/", "https://tower.codalyn.app")).toBe(
      "https://codalyn.app/"
    );
  });

  it("resolves same-origin paths without preserving the current query string", () => {
    expect(resolveTowerSignOutNavigationHref("/", "https://tower.codalyn.app")).toBe("https://tower.codalyn.app/");
  });
});
