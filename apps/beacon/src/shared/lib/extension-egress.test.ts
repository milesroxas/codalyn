import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const towerOrigin = vi.hoisted(() => ({ value: "" }));

vi.mock("@/shared/lib/beacon-tower-origin", () => ({
  readBeaconTowerOrigin: () => towerOrigin.value,
}));

import {
  EgressPolicyError,
  extensionFetch,
  isAllowedAssetUploadUrl,
  isTowerUrl,
  resolveEgressDestination,
} from "./extension-egress";

describe("extension egress policy (App Review Preflight: External API Calls)", () => {
  beforeEach(() => {
    towerOrigin.value = "https://tower.test";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("classifies the baked Tower origin, any path, as tower", () => {
    expect(isTowerUrl("https://tower.test/api/auth/get-session")).toBe(true);
    expect(resolveEgressDestination("https://tower.test/api/v2/webflow/sites/s1/assets")).toBe("tower");
  });

  it("matches Tower by exact origin — scheme, host and port — not by prefix or suffix", () => {
    expect(isTowerUrl("http://tower.test/api")).toBe(false);
    expect(isTowerUrl("https://tower.test:8443/api")).toBe(false);
    expect(isTowerUrl("https://tower.test.evil.example/api")).toBe(false);
    expect(isTowerUrl("https://eviltower.test/api")).toBe(false);
    expect(isTowerUrl("https://tower.test@evil.example/api")).toBe(false);
    expect(isTowerUrl("https://evil.example/https://tower.test/api")).toBe(false);
  });

  it("tolerates a trailing slash on the baked origin", () => {
    towerOrigin.value = "https://tower.test/";
    expect(isTowerUrl("https://tower.test/api")).toBe(true);
  });

  it("classifies a presigned Webflow asset upload as webflow-asset-upload", () => {
    expect(resolveEgressDestination("https://s3.amazonaws.com/webflow-prod-assets")).toBe("webflow-asset-upload");
    expect(resolveEgressDestination("https://uploads.webflow.com/asset")).toBe("webflow-asset-upload");
  });

  it("refuses every other destination, including relative paths once an origin is baked", () => {
    expect(resolveEgressDestination("https://api.example.com/v1")).toBeNull();
    expect(resolveEgressDestination("https://us.i.posthog.com/e/")).toBeNull();
    expect(resolveEgressDestination("/api/auth/get-session")).toBeNull();
    expect(resolveEgressDestination("//tower.test/api")).toBeNull();
    expect(resolveEgressDestination("javascript:alert(1)")).toBeNull();
    expect(resolveEgressDestination("")).toBeNull();
  });

  it("with no baked origin (Vitest only) accepts Tower-relative paths and nothing else absolute-but-foreign", () => {
    towerOrigin.value = "";
    expect(resolveEgressDestination("/api/auth/get-session")).toBe("tower");
    expect(resolveEgressDestination("//evil.example/api")).toBeNull();
    expect(resolveEgressDestination("https://evil.example/api")).toBeNull();
    expect(resolveEgressDestination("https://s3.amazonaws.com/webflow-prod-assets")).toBe("webflow-asset-upload");
  });

  it("extensionFetch forwards an allowed request to the platform fetch with the caller's init", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const init = { method: "POST", credentials: "include" as const };

    const res = await extensionFetch("https://tower.test/api/auth/sign-out", init);

    expect(res.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://tower.test/api/auth/sign-out", init);
  });

  it("extensionFetch rejects a refused destination before any request is made", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(extensionFetch("https://api.example.com/collect", { method: "POST" })).rejects.toBeInstanceOf(
      EgressPolicyError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bounds the URL echoed in the policy error", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const long = `https://evil.example/${"a".repeat(500)}`;

    await expect(extensionFetch(long)).rejects.toThrow(/…"/);
    await expect(extensionFetch(long)).rejects.not.toThrow(new RegExp("a".repeat(200)));
  });
});

describe("isAllowedAssetUploadUrl", () => {
  it("accepts HTTPS upload endpoints on Webflow and Amazon S3 hosts", () => {
    // Path-style — the shape the Webflow Data API documents for `uploadUrl`.
    expect(isAllowedAssetUploadUrl("https://s3.amazonaws.com/webflow-bucket/key")).toBe(true);
    expect(isAllowedAssetUploadUrl("https://s3.us-west-2.amazonaws.com/webflow-prod-assets/key")).toBe(true);
    expect(isAllowedAssetUploadUrl("https://s3-us-west-2.amazonaws.com/webflow-prod-assets/key")).toBe(true);
    // Virtual-hosted style.
    expect(isAllowedAssetUploadUrl("https://webflow-prod-assets.s3.amazonaws.com/key")).toBe(true);
    expect(isAllowedAssetUploadUrl("https://webflow-prod-assets.s3.us-east-1.amazonaws.com/key")).toBe(true);
    // Webflow-owned hosts.
    expect(isAllowedAssetUploadUrl("https://uploads.webflow.com/asset")).toBe(true);
    expect(isAllowedAssetUploadUrl("https://webflow.com/upload")).toBe(true);
    expect(isAllowedAssetUploadUrl("https://uploads-ssl.website-files.com/asset")).toBe(true);
  });

  it("rejects non-HTTPS, lookalike, and arbitrary hosts", () => {
    expect(isAllowedAssetUploadUrl("http://s3.amazonaws.com/webflow-bucket/key")).toBe(false);
    expect(isAllowedAssetUploadUrl("https://evil.example/upload")).toBe(false);
    expect(isAllowedAssetUploadUrl("https://webflow.com.evil.example/upload")).toBe(false);
    expect(isAllowedAssetUploadUrl("https://webflow.com.evil.com/upload")).toBe(false);
    expect(isAllowedAssetUploadUrl("https://amazonaws.com.evil.com/upload")).toBe(false);
    expect(isAllowedAssetUploadUrl("https://notwebflow.com/upload")).toBe(false);
    expect(isAllowedAssetUploadUrl("https://website-files.com.evil.com/upload")).toBe(false);
    expect(isAllowedAssetUploadUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedAssetUploadUrl("not a url")).toBe(false);
    expect(isAllowedAssetUploadUrl("")).toBe(false);
  });

  it("rejects AWS hosts that are not S3 endpoints (any bucket is not any Webflow bucket)", () => {
    // The old `*.amazonaws.com` suffix test accepted every AWS-hosted host, including attacker-controlled
    // buckets and unrelated AWS service endpoints. Only S3 endpoint host shapes are allowed now.
    expect(isAllowedAssetUploadUrl("https://evil-bucket.amazonaws.com/upload/key")).toBe(false);
    expect(isAllowedAssetUploadUrl("https://amazonaws.com/upload")).toBe(false);
    expect(isAllowedAssetUploadUrl("https://execute-api.us-east-1.amazonaws.com/prod/upload")).toBe(false);
    expect(isAllowedAssetUploadUrl("https://lambda.us-east-1.amazonaws.com/2015-03-31/functions")).toBe(false);
    // `s3` must be its own host label, and the region label must look like a real AWS region.
    expect(isAllowedAssetUploadUrl("https://evils3.amazonaws.com/key")).toBe(false);
    expect(isAllowedAssetUploadUrl("https://s3.evil.amazonaws.com/key")).toBe(false);
    expect(isAllowedAssetUploadUrl("https://s3.amazonaws.com.evil.com/key")).toBe(false);
    expect(isAllowedAssetUploadUrl("https://s3.amazonaws.evil.com/key")).toBe(false);
  });

  it("resolves userinfo tricks to the real host before matching", () => {
    expect(isAllowedAssetUploadUrl("https://s3.amazonaws.com@evil.example/key")).toBe(false);
    expect(isAllowedAssetUploadUrl("https://webflow.com@evil.example/upload")).toBe(false);
  });
});
/**
 * Source-level pin for the bundle gate (scripts/build-cli.mjs pins exactly one bare `fetch(` and one
 * `new MutationObserver(` in Beacon release output): no first-party module other than this one may
 * call `fetch` directly, and no first-party module may construct a MutationObserver. Generated
 * site-runtime source strings live in these files too, so the sweep covers the published-site
 * runtime as well as the extension.
 */
describe("first-party source keeps to the single egress point", () => {
  const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const egressModule = join(srcRoot, "shared", "lib", "extension-egress.ts");
  const BARE_FETCH_CALL = /(?<![\w$.])fetch\(/;
  const MUTATION_OBSERVER = /new MutationObserver\(/;

  function listSourceFiles(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "__tests__") {
          listSourceFiles(full, out);
        }
        continue;
      }
      if (
        !/\.(ts|tsx)$/.test(entry.name) ||
        /\.(test|stories)\.(ts|tsx)$/.test(entry.name) ||
        entry.name.endsWith(".d.ts")
      ) {
        continue;
      }
      out.push(full);
    }
    return out;
  }

  const files = listSourceFiles(srcRoot);

  it("finds the source tree it is guarding", () => {
    expect(files.length).toBeGreaterThan(100);
    expect(files).toContain(egressModule);
  });

  it("calls fetch only from extension-egress.ts", () => {
    const offenders = files
      .filter((file) => file !== egressModule && BARE_FETCH_CALL.test(readFileSync(file, "utf-8")))
      .map((file) => relative(srcRoot, file));
    expect(offenders).toEqual([]);
    expect(readFileSync(egressModule, "utf-8").match(/(?<![\w$.])fetch\(/g)).toHaveLength(1);
  });

  it("constructs no MutationObserver in first-party code (the one in the bundle is Lexical's)", () => {
    const offenders = files
      .filter((file) => MUTATION_OBSERVER.test(readFileSync(file, "utf-8")))
      .map((file) => relative(srcRoot, file));
    expect(offenders).toEqual([]);
  });
});
