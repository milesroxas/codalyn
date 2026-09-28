import { describe, expect, it } from "vitest";
import { isWebflowHostedAssetUrl, readWebflowHostedAssetUrl } from "./webflow-hosted-asset-url";

const HOSTED =
  "https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/6aac8a88596e00b6_codalyn-beacon-runtime-9b7da263.js";

/**
 * Review round 9 (2026-09-28): the hosted URL returned by create-asset was checked only for a non-empty
 * string before registration. It must be an HTTPS URL on a Webflow asset origin with no credentials and
 * no non-default port.
 */
describe("isWebflowHostedAssetUrl", () => {
  it("accepts the canonical Webflow asset CDN URL and the other Webflow asset hosts", () => {
    expect(isWebflowHostedAssetUrl(HOSTED)).toBe(true);
    expect(isWebflowHostedAssetUrl("https://website-files.com/a/b.js")).toBe(true);
    expect(isWebflowHostedAssetUrl("https://uploads-ssl.webflow.com/a/b.map.json")).toBe(true);
    // The default port is dropped by the URL parser: same origin, same destination.
    expect(isWebflowHostedAssetUrl("https://cdn.prod.website-files.com:443/a/b.js")).toBe(true);
    // Query strings are part of the served location; they do not change the origin.
    expect(isWebflowHostedAssetUrl(`${HOSTED}?v=2`)).toBe(true);
  });

  it.each([
    ["http", "http://cdn.prod.website-files.com/a/b.js"],
    ["another host", "https://cdn.example.com/codalyn-beacon-runtime-abc.js"],
    ["lookalike host", "https://cdn.prod.website-files.com.evil.example/a/b.js"],
    ["suffix without a dot", "https://evilwebsite-files.com/a/b.js"],
    ["bare webflow.com apex", "https://webflow.com/a/b.js"],
    ["URL username", "https://user@cdn.prod.website-files.com/a/b.js"],
    ["URL username and password", "https://user:pw@cdn.prod.website-files.com/a/b.js"],
    ["non-default port", "https://cdn.prod.website-files.com:8443/a/b.js"],
    ["whitespace inside", "https://cdn.prod.website-files.com/a/b .js"],
    ["newline (comment break-out)", "https://cdn.prod.website-files.com/a/b.js\nalert(1)"],
    ["protocol-relative", "//cdn.prod.website-files.com/a/b.js"],
    ["relative path", "/a/b.js"],
    ["data URL", "data:text/javascript,alert(1)"],
    ["empty", ""],
  ])("rejects %s", (_label, raw) => {
    expect(isWebflowHostedAssetUrl(raw)).toBe(false);
  });

  it("rejects non-string runtime shapes without throwing", () => {
    for (const raw of [null, undefined, 42, { value: HOSTED }, [HOSTED]]) {
      expect(isWebflowHostedAssetUrl(raw)).toBe(false);
    }
  });
});

describe("readWebflowHostedAssetUrl", () => {
  it("returns the value exactly as given when valid, null otherwise — never a rewritten URL", () => {
    expect(readWebflowHostedAssetUrl(HOSTED)).toBe(HOSTED);
    expect(readWebflowHostedAssetUrl("https://cdn.prod.website-files.com:8443/a/b.js")).toBeNull();
    expect(readWebflowHostedAssetUrl({ hostedUrl: HOSTED })).toBeNull();
    expect(readWebflowHostedAssetUrl("")).toBeNull();
  });
});
