import { describe, expect, it } from "vitest";
import { isAllowedWebflowProxyRequest } from "@/server/webflow-proxy-allowlist";

const SITE = "6a35c562c551e2eb11bc4f1c";
const COLL = "6a35c562c551e2eb11bc4f2d";
const ITEM = "6a35c562c551e2eb11bc4f3e";
const FIELD = "6a35c562c551e2eb11bc4f4f";
const PAGE = "6a35c562c551e2eb11bc4f5a";
const ASSET = "6a35c562c551e2eb11bc4f6b";

/** Every `/api/v2/webflow/…` call in apps/beacon/src (audited 2026-09-18), as method + segments. */
const BEACON_CALLS: Array<[string, string[]]> = [
  ["GET", ["sites", SITE]],
  ["GET", ["sites", SITE, "collections"]],
  ["GET", ["sites", SITE, "pages"]],
  ["GET", ["sites", SITE, "custom_code"]],
  ["GET", ["sites", SITE, "registered_scripts"]],
  ["POST", ["sites", SITE, "registered_scripts", "hosted"]],
  ["GET", ["sites", SITE, "assets"]],
  ["POST", ["sites", SITE, "assets"]],
  ["DELETE", ["assets", ASSET]],
  ["GET", ["pages", PAGE, "custom_code"]],
  ["PUT", ["pages", PAGE, "custom_code"]],
  ["GET", ["collections", COLL]],
  ["POST", ["collections", COLL, "fields"]],
  ["DELETE", ["collections", COLL, "fields", FIELD]],
  ["GET", ["collections", COLL, "items"]],
  ["PATCH", ["collections", COLL, "items"]],
  ["PATCH", ["collections", COLL, "items", "live"]],
  ["GET", ["collections", COLL, "items", ITEM]],
  ["GET", ["collections", COLL, "items", ITEM, "live"]],
  ["PATCH", ["collections", COLL, "items", ITEM, "live"]],
];

describe("isAllowedWebflowProxyRequest", () => {
  it("forwards every call the Beacon extension makes", () => {
    for (const [method, segments] of BEACON_CALLS) {
      expect(isAllowedWebflowProxyRequest(method, segments), `${method} ${segments.join("/")}`).toBe(true);
    }
  });

  it("is case-insensitive on the method only", () => {
    expect(isAllowedWebflowProxyRequest("get", ["sites", SITE])).toBe(true);
    expect(isAllowedWebflowProxyRequest("GET", ["Sites", SITE])).toBe(false);
  });

  it("refuses everything the token's scopes would otherwise admit but Beacon never calls", () => {
    const refused: Array<[string, string[]]> = [
      ["GET", ["sites"]], // listing every site the token reaches is a server-side job, not an extension call
      ["POST", ["sites", SITE, "publish"]],
      ["DELETE", ["sites", SITE, "custom_code"]],
      ["PUT", ["sites", SITE, "custom_code"]],
      ["DELETE", ["pages", PAGE, "custom_code"]],
      ["DELETE", ["collections", COLL]],
      ["POST", ["collections", COLL, "items"]],
      ["DELETE", ["collections", COLL, "items", ITEM]],
      ["POST", ["collections", COLL, "items", "publish"]],
      ["GET", ["collections", COLL, "items", ITEM, "live", "extra"]],
      ["GET", ["sites", SITE, "collections", COLL]],
      ["GET", ["token", "authorized_by"]],
      ["GET", ["workspaces"]],
      ["GET", []],
    ];
    for (const [method, segments] of refused) {
      expect(isAllowedWebflowProxyRequest(method, segments), `${method} ${segments.join("/")}`).toBe(false);
    }
  });

  it("matches exact segments — a path that merely contains an allowed one is refused", () => {
    expect(isAllowedWebflowProxyRequest("GET", ["v2", "sites", SITE])).toBe(false);
    expect(isAllowedWebflowProxyRequest("GET", ["sites", SITE, "pages", "x"])).toBe(false);
    expect(isAllowedWebflowProxyRequest("GET", ["sites", `${SITE}/collections`])).toBe(false);
  });
});
