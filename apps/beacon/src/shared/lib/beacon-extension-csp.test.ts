import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CODALYN_POSTHOG_HOST } from "@codalyn/observability";
import { describe, expect, it } from "vitest";
import {
  BEACON_CSP_PLACEHOLDER,
  buildBeaconExtensionCspContent,
  buildQualityComparePopoutCspContent,
} from "./beacon-extension-csp";

const PRODUCTION_TOWER_ORIGIN = "https://tower.codalyn.app";
/** Where Webflow's hosted runtime rewrites the installed bundle's relative asset URLs to. */
const WEBFLOW_HOSTED_BUNDLE_HOST = "https://cdn.prod.website-files.com";

function directiveMap(policy: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of policy.split(";")) {
    const tokens = part.trim().split(/\s+/);
    const name = tokens[0];
    if (!name) {
      continue;
    }
    expect(map.has(name)).toBe(false); // no duplicate directives
    map.set(name, tokens.slice(1));
  }
  return map;
}

/**
 * These tests pin the enforced Marketplace CSP (Telemetry / External Endpoint Allowlisting):
 * the exact external-endpoint allowlist must not silently widen, weaken, or drop out of the
 * shipped documents.
 */
describe("buildBeaconExtensionCspContent", () => {
  const policy = buildBeaconExtensionCspContent(PRODUCTION_TOWER_ORIGIN);
  const directives = directiveMap(policy);

  it("denies by default and allows first-party scripts only", () => {
    expect(directives.get("default-src")).toEqual(["'none'"]);
    expect(directives.get("script-src")).toEqual(["'self'", WEBFLOW_HOSTED_BUNDLE_HOST]);
  });

  // Regression (2026-09-14, v0.1.0_public_09-14_13-55-57): with 'self' only, the installed extension
  // rendered blank — Webflow serves bundle.js, the modulepreload chunks and styles.css from the CDN
  // host, not the document origin, so the browser blocked every first-party script and stylesheet.
  it("admits the Webflow-hosted copy of the bundle for scripts, stylesheets and fonts", () => {
    for (const name of ["script-src", "style-src", "style-src-elem", "font-src"]) {
      expect(directives.get(name)).toContain(WEBFLOW_HOSTED_BUNDLE_HOST);
    }
  });

  it("admits only the exact hosted-bundle host for code, never a wildcard Webflow host", () => {
    for (const name of ["script-src", "style-src-elem", "font-src"]) {
      const sources = directives.get(name) ?? [];
      expect(sources.filter((source) => source.startsWith("https://"))).toEqual([WEBFLOW_HOSTED_BUNDLE_HOST]);
      expect(sources.some((source) => source.includes("*"))).toBe(false);
    }
  });

  it("never allows eval or inline script anywhere", () => {
    expect(policy).not.toContain("'unsafe-eval'");
    expect(directives.get("script-src")).not.toContain("'unsafe-inline'");
    expect(directives.get("script-src-elem")).toBeUndefined();
  });

  it("allowlists exactly the documented connect-src endpoints (PostHog is the only telemetry host)", () => {
    expect(directives.get("connect-src")).toEqual([
      "'self'",
      PRODUCTION_TOWER_ORIGIN,
      CODALYN_POSTHOG_HOST,
      "https://s3.amazonaws.com",
      "https://*.s3.amazonaws.com",
      "https://webflow.com",
      "https://*.webflow.com",
      "https://website-files.com",
      "https://*.website-files.com",
    ]);
  });

  it("mentions the PostHog host exactly once — no assets host, no second telemetry endpoint", () => {
    expect(CODALYN_POSTHOG_HOST).toBe("https://us.i.posthog.com");
    expect(policy.split(CODALYN_POSTHOG_HOST).length - 1).toBe(1);
    expect(policy).not.toContain("us-assets.i.posthog.com");
    expect(policy).not.toContain("sentry");
  });

  it("bakes the build-resolved Tower origin into connect-src", () => {
    const preview = buildBeaconExtensionCspContent("https://tower-preview.codalyn.app");
    expect(directiveMap(preview).get("connect-src")).toContain("https://tower-preview.codalyn.app");
    expect(preview).not.toContain(PRODUCTION_TOWER_ORIGIN);
  });

  it("restricts images to first-party, blob object URLs, and Webflow asset hosts — no data: URIs", () => {
    expect(directives.get("img-src")).toEqual([
      "'self'",
      "blob:",
      "https://webflow.com",
      "https://*.webflow.com",
      "https://website-files.com",
      "https://*.website-files.com",
    ]);
    expect(directives.get("font-src")).toEqual(["'self'", WEBFLOW_HOSTED_BUNDLE_HOST]);
  });

  it("blocks inline <style> elements in CSP3 engines while allowing React/Radix style attributes", () => {
    expect(directives.get("style-src")).toEqual(["'self'", WEBFLOW_HOSTED_BUNDLE_HOST, "'unsafe-inline'"]);
    expect(directives.get("style-src-elem")).toEqual(["'self'", WEBFLOW_HOSTED_BUNDLE_HOST]);
    expect(directives.get("style-src-attr")).toEqual(["'unsafe-inline'"]);
    expect(directives.get("style-src-elem")).not.toContain("'unsafe-inline'");
  });

  it("hard-blocks iframes, workers, plugins, form submission, and base rewriting", () => {
    expect(directives.get("frame-src")).toEqual(["'none'"]);
    expect(directives.get("worker-src")).toEqual(["'none'"]);
    expect(directives.get("object-src")).toEqual(["'none'"]);
    expect(directives.get("form-action")).toEqual(["'none'"]);
    expect(directives.get("base-uri")).toEqual(["'none'"]);
  });
});

describe("buildQualityComparePopoutCspContent", () => {
  const policy = buildQualityComparePopoutCspContent();
  const directives = directiveMap(policy);

  it("enforces the popout's zero-network claim outright", () => {
    expect(directives.get("default-src")).toEqual(["'none'"]);
    expect(directives.get("connect-src")).toEqual(["'none'"]);
    expect(policy).not.toContain("posthog");
    // The only external host is the Webflow-hosted copy of the popout's own scripts/stylesheet.
    expect(policy.split(WEBFLOW_HOSTED_BUNDLE_HOST).join("")).not.toContain("https://");
  });

  it("renders only blob object URLs and first-party scripts/styles", () => {
    expect(directives.get("script-src")).toEqual(["'self'", WEBFLOW_HOSTED_BUNDLE_HOST]);
    expect(directives.get("img-src")).toEqual(["blob:"]);
    expect(directives.get("style-src-elem")).toEqual(["'self'", WEBFLOW_HOSTED_BUNDLE_HOST]);
  });
});

describe("source HTML entries", () => {
  const entries = [
    new URL("../../../index.html", import.meta.url),
    new URL("../../../quality-compare.html", import.meta.url),
  ];

  it("each shipped document carries exactly one CSP placeholder meta for the build to substitute", () => {
    for (const entry of entries) {
      const html = readFileSync(fileURLToPath(entry), "utf-8");
      const matches = html.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/g) ?? [];
      expect(matches).toHaveLength(1);
      expect(matches[0]).toContain(`content="${BEACON_CSP_PLACEHOLDER}"`);
    }
  });
});
