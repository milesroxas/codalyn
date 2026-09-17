import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const towerFetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/shared/lib/tower-client", () => ({
  getTowerOrigin: () => "https://tower.test",
  towerFetch: (path: string, init?: RequestInit) => towerFetchMock(path, init),
  towerFetchWithRetry: (path: string, init?: RequestInit) => towerFetchMock(path, init),
}));

import {
  assertCmsWriteAllowed,
  cmsLocaleRequestFields,
  LOCALIZED_SITE_CMS_WRITE_BLOCKED_MESSAGE,
  LocalizedSiteCmsWriteBlockedError,
  parseWebflowSiteLocales,
  resetCmsWriteLocaleCacheForTests,
  resolveCmsWriteLocale,
  resolveCurrentSiteCmsWriteLocale,
} from "./webflow-cms-write-locale";

const PRIMARY = { id: "653fd9af6a07fc9cfd7a5e57", cmsLocaleId: "653ad57de882f528b32e810e", tag: "en-US" };
const FRENCH = { id: "653fd9af6a07fc9cfd7a5e56", cmsLocaleId: "653fd9af6a07fc9cfd7a5e5d", tag: "fr-FR" };

/** The documented Get Site `locales` block (developers.webflow.com/data/docs/working-with-localization). */
function canonicalSite(secondary: unknown[] = [FRENCH]) {
  return {
    id: "6a35c562c551e2eb11bc4f1c",
    displayName: "Acme",
    locales: {
      primary: { ...PRIMARY, enabled: false, displayName: "English (United States)", subdirectory: "" },
      secondary,
    },
  };
}

describe("parseWebflowSiteLocales (Get Site boundary)", () => {
  it("canonical shape: primary + secondary with cmsLocaleId, localeId and tag", () => {
    expect(parseWebflowSiteLocales(canonicalSite())).toEqual({
      primary: {
        cmsLocaleId: PRIMARY.cmsLocaleId,
        localeId: PRIMARY.id,
        displayName: "English (United States)",
        tag: "en-US",
      },
      secondary: [{ cmsLocaleId: FRENCH.cmsLocaleId, localeId: FRENCH.id, displayName: null, tag: "fr-FR" }],
    });
  });

  it("alternate shapes: wrapped { value } identifiers and a missing secondary array", () => {
    const site = {
      locales: {
        primary: { id: { value: PRIMARY.id }, cmsLocaleId: { value: PRIMARY.cmsLocaleId }, tag: { value: "en-US" } },
      },
    };
    expect(parseWebflowSiteLocales(site)).toEqual({
      primary: { cmsLocaleId: PRIMARY.cmsLocaleId, localeId: PRIMARY.id, displayName: null, tag: "en-US" },
      secondary: [],
    });
  });

  it("missing fields: no locales block, no primary, null response → nothing invented", () => {
    expect(parseWebflowSiteLocales({ id: "site" })).toEqual({ primary: null, secondary: [] });
    expect(parseWebflowSiteLocales({ locales: { secondary: [FRENCH] } })).toEqual({
      primary: null,
      secondary: [{ cmsLocaleId: FRENCH.cmsLocaleId, localeId: FRENCH.id, displayName: null, tag: "fr-FR" }],
    });
    expect(parseWebflowSiteLocales(null)).toEqual({ primary: null, secondary: [] });
    expect(parseWebflowSiteLocales("locales")).toEqual({ primary: null, secondary: [] });
  });

  it("malformed fields: non-string / empty cmsLocaleId drops that locale; non-array secondary is ignored", () => {
    expect(
      parseWebflowSiteLocales({
        locales: {
          primary: { id: PRIMARY.id, cmsLocaleId: 12345 },
          secondary: [{ cmsLocaleId: "" }, { cmsLocaleId: "   " }, null, "fr-FR", FRENCH],
        },
      })
    ).toEqual({
      primary: null,
      secondary: [{ cmsLocaleId: FRENCH.cmsLocaleId, localeId: FRENCH.id, displayName: null, tag: "fr-FR" }],
    });
    expect(parseWebflowSiteLocales({ locales: { primary: PRIMARY, secondary: "fr-FR" } }).secondary).toEqual([]);
  });

  it("matches by identifier, never by label: a locale with only displayName/tag is not a locale", () => {
    expect(
      parseWebflowSiteLocales({ locales: { primary: { displayName: "English", tag: "en-US" }, secondary: [] } })
    ).toEqual({ primary: null, secondary: [] });
  });
});

describe("resolveCmsWriteLocale (pure decision)", () => {
  it("names the primary locale explicitly on a site without secondary locales", () => {
    expect(resolveCmsWriteLocale(parseWebflowSiteLocales(canonicalSite([])), "blocked")).toEqual({
      kind: "primary",
      cmsLocaleId: PRIMARY.cmsLocaleId,
    });
  });

  it("is unscoped when Localization is off (no locale identifiers exposed)", () => {
    expect(resolveCmsWriteLocale({ primary: null, secondary: [] }, "blocked")).toEqual({ kind: "unscoped" });
    expect(resolveCmsWriteLocale({ primary: null, secondary: [] }, "primary")).toEqual({ kind: "unscoped" });
  });

  it("blocks a site with secondary locales under the Marketplace policy", () => {
    expect(resolveCmsWriteLocale(parseWebflowSiteLocales(canonicalSite()), "blocked")).toEqual({
      kind: "blocked",
      secondaryTags: ["fr-FR"],
    });
  });

  it("writes the explicit primary locale under the 'primary' policy — never a secondary one", () => {
    expect(resolveCmsWriteLocale(parseWebflowSiteLocales(canonicalSite()), "primary")).toEqual({
      kind: "primary",
      cmsLocaleId: PRIMARY.cmsLocaleId,
    });
  });

  it("blocks under any policy when secondary locales exist but the primary cmsLocaleId is unknown", () => {
    const locales = parseWebflowSiteLocales({ locales: { secondary: [FRENCH] } });
    expect(resolveCmsWriteLocale(locales, "primary")).toEqual({ kind: "blocked", secondaryTags: ["fr-FR"] });
  });

  it("defaults the policy to the build flag (blocked unless VITE_BEACON_LOCALIZED_SITE_CMS_WRITES=primary)", () => {
    vi.stubEnv("VITE_BEACON_LOCALIZED_SITE_CMS_WRITES", "");
    expect(resolveCmsWriteLocale(parseWebflowSiteLocales(canonicalSite())).kind).toBe("blocked");
    vi.unstubAllEnvs();
  });
});

describe("assertCmsWriteAllowed / cmsLocaleRequestFields", () => {
  it("throws the user-facing error for a blocked decision and passes the others through", () => {
    expect(() => assertCmsWriteAllowed({ kind: "blocked", secondaryTags: ["fr-FR"] })).toThrow(
      LocalizedSiteCmsWriteBlockedError
    );
    expect(() => assertCmsWriteAllowed({ kind: "blocked", secondaryTags: [] })).toThrow(
      LOCALIZED_SITE_CMS_WRITE_BLOCKED_MESSAGE
    );
    expect(assertCmsWriteAllowed({ kind: "unscoped" })).toEqual({ kind: "unscoped" });
    expect(assertCmsWriteAllowed({ kind: "primary", cmsLocaleId: "x" })).toEqual({ kind: "primary", cmsLocaleId: "x" });
  });

  it("adds cmsLocaleId to a request only for a primary decision", () => {
    expect(cmsLocaleRequestFields({ kind: "primary", cmsLocaleId: PRIMARY.cmsLocaleId })).toEqual({
      cmsLocaleId: PRIMARY.cmsLocaleId,
    });
    expect(cmsLocaleRequestFields({ kind: "unscoped" })).toEqual({});
    expect(cmsLocaleRequestFields({ kind: "blocked", secondaryTags: [] })).toEqual({});
  });
});

describe("resolveCurrentSiteCmsWriteLocale (Tower proxy + Designer site)", () => {
  beforeEach(() => {
    resetCmsWriteLocaleCacheForTests();
    towerFetchMock.mockReset();
    vi.stubGlobal("webflow", { getSiteInfo: async () => ({ siteId: "6a35c562c551e2eb11bc4f1c" }) });
    vi.stubEnv("VITE_BEACON_LOCALIZED_SITE_CMS_WRITES", "");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("reads GET /sites/{id} once per site and caches the decision", async () => {
    towerFetchMock.mockResolvedValue(new Response(JSON.stringify(canonicalSite([])), { status: 200 }));
    await expect(resolveCurrentSiteCmsWriteLocale()).resolves.toEqual({
      kind: "primary",
      cmsLocaleId: PRIMARY.cmsLocaleId,
    });
    await expect(resolveCurrentSiteCmsWriteLocale()).resolves.toEqual({
      kind: "primary",
      cmsLocaleId: PRIMARY.cmsLocaleId,
    });
    expect(towerFetchMock).toHaveBeenCalledTimes(1);
    expect(towerFetchMock.mock.calls[0][0]).toBe("/api/v2/webflow/sites/6a35c562c551e2eb11bc4f1c");
  });

  it("blocks a localized site under the Marketplace policy", async () => {
    towerFetchMock.mockResolvedValue(new Response(JSON.stringify(canonicalSite()), { status: 200 }));
    await expect(resolveCurrentSiteCmsWriteLocale()).resolves.toEqual({ kind: "blocked", secondaryTags: ["fr-FR"] });
  });

  it("fails closed and does not cache when the site lookup fails", async () => {
    towerFetchMock.mockResolvedValueOnce(new Response("nope", { status: 503 }));
    await expect(resolveCurrentSiteCmsWriteLocale()).rejects.toThrow(/no CMS write was made/);
    towerFetchMock.mockResolvedValueOnce(new Response(JSON.stringify(canonicalSite([])), { status: 200 }));
    await expect(resolveCurrentSiteCmsWriteLocale()).resolves.toEqual({
      kind: "primary",
      cmsLocaleId: PRIMARY.cmsLocaleId,
    });
    expect(towerFetchMock).toHaveBeenCalledTimes(2);
  });

  it("refuses to proceed without a site id", async () => {
    vi.stubGlobal("webflow", { getSiteInfo: async () => ({ siteId: "" }) });
    await expect(resolveCurrentSiteCmsWriteLocale()).rejects.toThrow(/current site/);
    expect(towerFetchMock).not.toHaveBeenCalled();
  });
});
