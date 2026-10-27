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
  grantWebflowAssetUpload,
  isTowerUrl,
  isWebflowAssetUploadUrlShape,
  resetWebflowAssetUploadGrantsForTests,
  resolveEgressDestination,
} from "./extension-egress";

/** The documented `uploadUrl` shape (Webflow create-asset reference), with a presigned key path. */
const UPLOAD_URL = "https://s3.amazonaws.com/webflow-prod-assets/abc123/runtime.js";

describe("extension egress policy (App Review Preflight: External API Calls)", () => {
  beforeEach(() => {
    towerOrigin.value = "https://tower.test";
    resetWebflowAssetUploadGrantsForTests();
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

  it("classifies a presigned upload URL as webflow-asset-upload only after the create-asset adapter granted it", () => {
    expect(resolveEgressDestination(UPLOAD_URL)).toBeNull();
    grantWebflowAssetUpload(UPLOAD_URL);
    expect(resolveEgressDestination(UPLOAD_URL)).toBe("webflow-asset-upload");
    // The grant is for the exact string — a sibling key on the same bucket is still refused.
    expect(resolveEgressDestination("https://s3.amazonaws.com/webflow-prod-assets/abc123/other.js")).toBeNull();
    expect(resolveEgressDestination(`${UPLOAD_URL}?x=1`)).toBeNull();
  });

  it("refuses every other destination, including relative paths once an origin is baked", () => {
    expect(resolveEgressDestination("https://api.example.com/v1")).toBeNull();
    expect(resolveEgressDestination("https://us.i.posthog.com/e/")).toBeNull();
    expect(resolveEgressDestination("https://uploads.webflow.com/asset")).toBeNull();
    expect(resolveEgressDestination("https://cdn.prod.website-files.com/x.js")).toBeNull();
    expect(resolveEgressDestination("/api/auth/get-session")).toBeNull();
    expect(resolveEgressDestination("//tower.test/api")).toBeNull();
    expect(resolveEgressDestination("javascript:alert(1)")).toBeNull();
    expect(resolveEgressDestination("")).toBeNull();
  });

  it("with no baked origin refuses everything that is not a granted upload URL, relative paths included", () => {
    towerOrigin.value = "";
    expect(resolveEgressDestination("/api/auth/get-session")).toBeNull();
    expect(resolveEgressDestination("//evil.example/api")).toBeNull();
    expect(resolveEgressDestination("https://evil.example/api")).toBeNull();
    expect(resolveEgressDestination(UPLOAD_URL)).toBeNull();
    grantWebflowAssetUpload(UPLOAD_URL);
    expect(resolveEgressDestination(UPLOAD_URL)).toBe("webflow-asset-upload");
  });

  it("extensionFetch forwards an allowed request to the platform fetch with the caller's init, redirect pinned to error and credentials pinned to omit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const init = { method: "POST", cache: "no-store" as const, headers: { Accept: "application/json" } };

    const res = await extensionFetch("https://tower.test/api/auth/sign-out", init);

    expect(res.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://tower.test/api/auth/sign-out", {
      ...init,
      redirect: "error",
      credentials: "omit",
    });
  });

  it("never sends or stores cookies — a caller cannot opt into credentials: include or same-origin (review round 8, third-party data egress)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    grantWebflowAssetUpload(UPLOAD_URL);

    await extensionFetch("https://tower.test/api/auth/get-session", { credentials: "include" });
    await extensionFetch("https://tower.test/api/auth/get-session", { credentials: "same-origin" });
    await extensionFetch("https://tower.test/api/auth/get-session");
    await extensionFetch(UPLOAD_URL, { method: "POST", credentials: "include" });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const call of fetchMock.mock.calls) {
      expect((call[1] as RequestInit).credentials).toBe("omit");
    }
  });

  it("never follows redirects — a caller cannot opt back into redirect: follow (review round 8)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await extensionFetch("https://tower.test/api/v1/beacon/settings", { redirect: "follow" });
    await extensionFetch("https://tower.test/api/v1/beacon/settings", { redirect: "manual" });
    await extensionFetch("https://tower.test/api/v1/beacon/settings");

    for (const call of fetchMock.mock.calls) {
      expect((call[1] as RequestInit).redirect).toBe("error");
    }
  });

  it("consumes an upload grant with the request that uses it (one grant, one POST)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    grantWebflowAssetUpload(UPLOAD_URL);

    await extensionFetch(UPLOAD_URL, { method: "POST" });
    expect(fetchMock).toHaveBeenCalledWith(UPLOAD_URL, { method: "POST", redirect: "error", credentials: "omit" });

    await expect(extensionFetch(UPLOAD_URL, { method: "POST" })).rejects.toBeInstanceOf(EgressPolicyError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("extensionFetch rejects a refused destination before any request is made", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(extensionFetch("https://api.example.com/collect", { method: "POST" })).rejects.toBeInstanceOf(
      EgressPolicyError
    );
    await expect(extensionFetch(UPLOAD_URL, { method: "POST" })).rejects.toBeInstanceOf(EgressPolicyError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bounds the URL echoed in the policy error", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const long = `https://evil.example/${"a".repeat(500)}`;

    await expect(extensionFetch(long)).rejects.toThrow(/…"/);
    await expect(extensionFetch(long)).rejects.not.toThrow(new RegExp("a".repeat(200)));
  });
});

describe("grantWebflowAssetUpload (create-asset response boundary)", () => {
  beforeEach(() => {
    towerOrigin.value = "https://tower.test";
    resetWebflowAssetUploadGrantsForTests();
  });

  it("returns the exact URL it granted", () => {
    expect(grantWebflowAssetUpload(UPLOAD_URL)).toBe(UPLOAD_URL);
  });

  it("refuses (and grants nothing for) a value outside the documented shape", () => {
    for (const bad of [
      "https://s3.amazonaws.com/evil-bucket/key",
      "https://evil-bucket.s3.amazonaws.com/key",
      "https://webflow-prod-assets.s3.us-east-1.amazonaws.com/key",
      "http://s3.amazonaws.com/webflow-prod-assets/key",
      "https://uploads.webflow.com/asset",
      "",
    ]) {
      expect(() => grantWebflowAssetUpload(bad)).toThrow(EgressPolicyError);
      expect(resolveEgressDestination(bad)).toBeNull();
    }
  });
});

describe("isWebflowAssetUploadUrlShape", () => {
  it("accepts Webflow's bucket in the virtual-hosted form production returns (observed 2026-09-17)", () => {
    expect(isWebflowAssetUploadUrlShape("https://webflow-prod-assets.s3.amazonaws.com/")).toBe(true);
    expect(isWebflowAssetUploadUrlShape("https://webflow-prod-assets.s3.amazonaws.com")).toBe(true);
    expect(isWebflowAssetUploadUrlShape("https://webflow-prod-assets.s3.amazonaws.com/key")).toBe(true);
    expect(isWebflowAssetUploadUrlShape("https://WEBFLOW-PROD-ASSETS.S3.AMAZONAWS.COM/")).toBe(true);
  });

  it("accepts the documented path-style form: HTTPS on the S3 host with the bucket as the first path segment", () => {
    expect(isWebflowAssetUploadUrlShape("https://s3.amazonaws.com/webflow-prod-assets/key")).toBe(true);
    expect(isWebflowAssetUploadUrlShape("https://s3.amazonaws.com/webflow-prod-assets")).toBe(true);
    expect(isWebflowAssetUploadUrlShape("https://S3.AMAZONAWS.COM/webflow-prod-assets/key")).toBe(true);
  });

  it("rejects every other bucket in the virtual-hosted form, and lookalikes of the bucket host", () => {
    expect(isWebflowAssetUploadUrlShape("https://evil-bucket.s3.amazonaws.com/")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://webflow-prod-assets-evil.s3.amazonaws.com/")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://evil.webflow-prod-assets.s3.amazonaws.com/")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://webflow-prod-assets.s3.amazonaws.com.evil.com/")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://webflow-prod-assets.s3.us-east-1.amazonaws.com/")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://webflow-prod-assets.s3-us-east-1.amazonaws.com/")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://webflow-prod-assets.amazonaws.com/")).toBe(false);
  });

  it("rejects every other bucket on the same host (any bucket is not Webflow's bucket)", () => {
    expect(isWebflowAssetUploadUrlShape("https://s3.amazonaws.com/webflow-bucket/key")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://s3.amazonaws.com/evil-bucket/webflow-prod-assets/key")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://s3.amazonaws.com/webflow-prod-assets-evil/key")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://s3.amazonaws.com/")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://s3.amazonaws.com")).toBe(false);
  });

  it("rejects regional, non-S3 AWS, Webflow-owned and lookalike hosts in the path-style form", () => {
    expect(isWebflowAssetUploadUrlShape("https://s3.us-west-2.amazonaws.com/webflow-prod-assets/key")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://s3-us-west-2.amazonaws.com/webflow-prod-assets/key")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://evil-bucket.amazonaws.com/webflow-prod-assets/key")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://execute-api.us-east-1.amazonaws.com/webflow-prod-assets")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://uploads.webflow.com/webflow-prod-assets/key")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://uploads-ssl.website-files.com/webflow-prod-assets")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://s3.amazonaws.com.evil.com/webflow-prod-assets/key")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://evils3.amazonaws.com/webflow-prod-assets/key")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://s3.amazonaws.evil.com/webflow-prod-assets/key")).toBe(false);
  });

  it("rejects non-HTTPS, userinfo tricks and non-URLs", () => {
    expect(isWebflowAssetUploadUrlShape("http://s3.amazonaws.com/webflow-prod-assets/key")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://s3.amazonaws.com@evil.example/webflow-prod-assets/key")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://user:pw@s3.amazonaws.com/webflow-prod-assets/key")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("https://user:pw@webflow-prod-assets.s3.amazonaws.com/")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("http://webflow-prod-assets.s3.amazonaws.com/")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("javascript:alert(1)")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("not a url")).toBe(false);
    expect(isWebflowAssetUploadUrlShape("")).toBe(false);
  });
});

/**
 * Source-level pin for the bundle gate (scripts/build-cli.mjs pins exactly one bare `fetch(` and zero
 * `MutationObserver` references in Beacon release output, and forbids `setAttribute("style"`): no first-party
 * module other than this one may call `fetch` directly, no first-party module may construct a
 * MutationObserver, and none may write a `style` attribute (the shipped CSP is `style-src-attr 'none'`).
 * Generated site-runtime source strings live in these files too, so the sweep covers the published-site
 * runtime as well as the extension.
 */
describe("first-party source keeps to the single egress point", () => {
  const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const egressModule = join(srcRoot, "shared", "lib", "extension-egress.ts");
  const BARE_FETCH_CALL = /(?<![\w$.])fetch\(/;
  const MUTATION_OBSERVER = /new MutationObserver\(/;
  const STYLE_ATTRIBUTE_WRITE = /setAttribute\(\s*["'`]style["'`]/;
  /** A `credentials` request option being set (string literal or forwarded from a caller's init). */
  const REQUEST_CREDENTIALS_OPTION = /\bcredentials\s*:\s*(?:["'`]|init)/;
  /** A Web Storage call whose literal key names a credential. */
  const CREDENTIAL_NAMED_STORAGE_KEY =
    /(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*["'`][^"'`]*(?:token|bearer|secret|password|credential)[^"'`]*["'`]/i;
  const ANY_STORAGE_API = /localStorage|sessionStorage|document\.cookie|indexedDB/;

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

  it("sets the request credentials mode only at the egress point, and only to omit (review round 8, third-party data egress)", () => {
    // `extensionFetch` pins `credentials: "omit"`; a caller setting its own mode would be overridden anyway,
    // so a second site is dead code that still reads as a cookie-bearing request to the bundle scanner.
    const offenders = files
      .filter((file) => file !== egressModule && REQUEST_CREDENTIALS_OPTION.test(readFileSync(file, "utf-8")))
      .map((file) => relative(srcRoot, file));
    expect(offenders).toEqual([]);
    expect(readFileSync(egressModule, "utf-8").match(/\bcredentials:\s*"omit"/g)).toHaveLength(1);
    expect(readFileSync(egressModule, "utf-8")).not.toMatch(/credentials:\s*"(?:include|same-origin)"/);
  });

  it("keeps credentials out of Web Storage: no storage call keyed by a credential name, and the session-token module uses no storage API (review round 8)", () => {
    const offenders = files
      .filter((file) => CREDENTIAL_NAMED_STORAGE_KEY.test(readFileSync(file, "utf-8")))
      .map((file) => relative(srcRoot, file));
    expect(offenders).toEqual([]);
    const tokenModule = join(srcRoot, "features", "auth", "lib", "beacon-tower-session-token.ts");
    expect(files).toContain(tokenModule);
    expect(readFileSync(tokenModule, "utf-8")).not.toMatch(ANY_STORAGE_API);
  });

  it("writes a style attribute only through the Designer API on the user's canvas placeholder (shipped CSP: style-src-attr 'none')", () => {
    // Both sites call `DOMElement.setAttribute` on a Designer canvas element — a different document,
    // outside the extension iframe's CSP. Nothing writes a style attribute in the extension document.
    const offenders = files
      .filter((file) => STYLE_ATTRIBUTE_WRITE.test(readFileSync(file, "utf-8")))
      .map((file) => relative(srcRoot, file))
      .sort();
    expect(offenders).toEqual([
      "features/cms-slots/model/cms-slot-list-target-designer-placeholder.ts",
      "features/cms-slots/model/create-cms-slot-list-target-component.ts",
    ]);
  });
});
