import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readBeaconRuntimeHashFromVersion } from "@/features/cms-slots/model/cms-slot-page-inline-script";

/**
 * Registration records cannot be deleted through the Webflow Data API, so every redundant
 * `POST /registered_scripts/hosted` is a permanent entry against the customer's site. Sync fires on composer save,
 * slot rename, slot delete and install — many times per editing session — so these tests pin the call *counts*, not
 * just the decision predicate: the wiring is what regresses.
 */

vi.mock("@/shared/lib/tower-client", () => ({
  getTowerOrigin: () => "https://tower.test",
  towerFetch: vi.fn(),
  towerFetchWithRetry: (path: string, init?: RequestInit) => towerRoute(path, init),
}));

vi.mock("@/features/cms-slots/model/cms-slot-list-target-slot-style", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/cms-slots/model/cms-slot-list-target-slot-style")>()),
  ensureCmsSlotListTargetLayoutStyle: vi.fn(async () => ({}) as unknown),
}));

const SITE_ID = "site-1";
const PAGE_ID = "page-1";
/** The `uploadUrl` production returns (virtual-hosted form; observed 2026-09-17). */
const UPLOAD_URL = "https://webflow-prod-assets.s3.amazonaws.com/";

type PageScript = {
  id: string;
  location: string;
  version: string;
  attributes?: Record<string, string>;
};

/** Mutable fake of the customer's site as the Data API would report it. */
type FakeSite = {
  pageScripts: PageScript[];
  registered: { id: string; displayName: string; hostedLocation: string; version: string }[];
  assets: { id: string; hostedUrl: string; originalFileName: string }[];
  /** When set, Webflow refuses to create `.map.json` assets (simulates an unsupported file type). */
  refuseSourceMapAssets: boolean;
  /** When set, `GET /registered_scripts` fails (the registry read is best-effort and must never block a sync). */
  registryUnavailable: boolean;
  counts: {
    register: number;
    createAsset: number;
    upload: number;
    putPageCode: number;
    getPageCode: number;
    getRegistry: number;
  };
};

let site: FakeSite;

function freshSite(): FakeSite {
  return {
    pageScripts: [],
    registered: [],
    assets: [],
    refuseSourceMapAssets: false,
    registryUnavailable: false,
    counts: { register: 0, createAsset: 0, upload: 0, putPageCode: 0, getPageCode: 0, getRegistry: 0 },
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function body<T>(init: RequestInit | undefined): T {
  return JSON.parse(String(init?.body ?? "{}")) as T;
}

/**
 * What the install flow actually sent: every presigned upload in order (file name + bytes), the runtime bytes of
 * the last JS upload, and the SRI pin registered for them.
 */
let captured: { source: string; integrity: string; uploads: { name: string; text: string }[] } = {
  source: "",
  integrity: "",
  uploads: [],
};

/** Minimal `METHOD /path` router over the Tower proxy endpoints `cms-slot-page-inline-script` calls. */
const TOWER_ROUTES: Record<string, (init: RequestInit | undefined) => Response> = {
  [`POST /api/v2/webflow/sites/${SITE_ID}/assets`]: (init) => {
    const { fileName } = body<{ fileName?: string }>(init);
    if (site.refuseSourceMapAssets && String(fileName ?? "").endsWith(".map.json")) {
      return json({ message: "Unsupported file type" }, 400);
    }
    site.counts.createAsset += 1;
    return json({
      uploadUrl: UPLOAD_URL,
      uploadDetails: { key: "k", policy: "p" },
      hostedUrl: `https://cdn.prod.website-files.com/${fileName ?? "runtime.js"}`,
    });
  },
  [`GET /api/v2/webflow/sites/${SITE_ID}/assets`]: () =>
    json({ assets: site.assets, pagination: { limit: 100, offset: 0, total: site.assets.length } }),
  [`POST /api/v2/webflow/sites/${SITE_ID}/registered_scripts/hosted`]: (init) => {
    site.counts.register += 1;
    const { hostedLocation, version, integrityHash } = body<{
      hostedLocation?: string;
      version?: string;
      integrityHash?: string;
    }>(init);
    captured.integrity = String(integrityHash ?? "");
    const id = `reg-${site.counts.register}`;
    site.registered.push({
      id,
      displayName: "CodalynBeaconRuntime",
      hostedLocation: String(hostedLocation ?? ""),
      version: String(version ?? "1.0.0"),
    });
    return json({ id, version: String(version ?? "1.0.0") });
  },
  [`GET /api/v2/webflow/sites/${SITE_ID}/registered_scripts`]: () => {
    site.counts.getRegistry += 1;
    if (site.registryUnavailable) {
      return json({ message: "Service unavailable" }, 503);
    }
    return json({
      registeredScripts: site.registered,
      pagination: { limit: 100, offset: 0, total: site.registered.length },
    });
  },
  [`GET /api/v2/webflow/pages/${PAGE_ID}/custom_code`]: () => {
    site.counts.getPageCode += 1;
    return json({ scripts: site.pageScripts });
  },
  [`PUT /api/v2/webflow/pages/${PAGE_ID}/custom_code`]: (init) => {
    site.counts.putPageCode += 1;
    const { scripts } = body<{ scripts?: PageScript[] }>(init);
    site.pageScripts = Array.isArray(scripts) ? scripts : [];
    return json({ scripts: site.pageScripts });
  },
  [`GET /api/v2/webflow/sites/${SITE_ID}/custom_code`]: () => json({ scripts: [] }),
  [`GET /api/v2/webflow/sites/${SITE_ID}/pages`]: () =>
    json({ pages: [{ id: PAGE_ID }], pagination: { limit: 100, offset: 0, total: 1 } }),
};

async function towerRoute(path: string, init?: RequestInit): Promise<Response> {
  const method = String(init?.method ?? "GET").toUpperCase();
  const [pathname] = path.split("?");
  const handler = TOWER_ROUTES[`${method} ${pathname}`];
  return handler ? handler(init) : json({ message: `unrouted ${method} ${pathname}` }, 500);
}

/** The applied footer entry — ours by registered-script id, the stable identifier the Data API hands back. */
function appliedBeaconScript(): PageScript | undefined {
  return site.pageScripts.find((s) => site.registered.some((r) => r.id === s.id));
}

/** Every page entry that is ours (registered id, `+beacon.<hash>` version or the legacy marker). */
function beaconScriptsOnPage(): PageScript[] {
  return site.pageScripts.filter(
    (s) =>
      site.registered.some((r) => r.id === s.id) ||
      readBeaconRuntimeHashFromVersion(s.version) != null ||
      s.attributes?.["data-codalyn-beacon"] === "runtime"
  );
}

/** A page entry as a build before 2026-09-26 applied it: the two `data-*` markers Webflow rendered onto the tag. */
function legacyAttributes(hash: string): Record<string, string> {
  return { "data-codalyn-beacon": "runtime", "data-codalyn-beacon-src-hash": hash };
}

beforeEach(() => {
  vi.useFakeTimers();
  captured = { source: "", integrity: "", uploads: [] };
  site = freshSite();
  vi.stubGlobal("webflow", {
    getSiteInfo: async () => ({ siteId: SITE_ID }),
    getCurrentPage: async () => ({ id: PAGE_ID }),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url) === UPLOAD_URL) {
        site.counts.upload += 1;
        const file = init?.body instanceof FormData ? init.body.get("file") : null;
        const text = file instanceof Blob ? await file.text() : "";
        const name = file instanceof File ? file.name : "";
        captured.uploads.push({ name, text });
        if (name.endsWith(".js")) {
          captured.source = text;
        }
        return new Response(null, { status: 204 });
      }
      return new Response(null, { status: 500 });
    })
  );
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function sync(options?: { force?: boolean }): Promise<void> {
  const mod = await import("@/features/cms-slots/model/cms-slot-page-inline-script");
  await mod.syncCmsSlotPageInlineScript(options);
}

async function status(): Promise<{ synced: boolean; reason?: string }> {
  const mod = await import("@/features/cms-slots/model/cms-slot-page-inline-script");
  return mod.getCmsSlotPageRuntimeSyncStatus();
}

describe("syncCmsSlotPageInlineScript registration budget", () => {
  it("registers exactly once on the first sync of a page (two assets: the source map, then the runtime JS)", async () => {
    await sync();
    expect(site.counts.createAsset).toBe(2);
    expect(site.counts.upload).toBe(2);
    expect(site.counts.register).toBe(1);
    expect(site.counts.putPageCode).toBe(1);
    expect(readBeaconRuntimeHashFromVersion(appliedBeaconScript()?.version)).toMatch(/^[0-9a-f]{8}$/);
  });

  it("applies the page entry as `{ id, location, version }` only — no attributes, so Webflow renders the tag as `src type integrity crossorigin` (App Review Preflight: script integrity)", async () => {
    await sync();
    const applied = appliedBeaconScript();
    expect(applied).toBeDefined();
    expect(Object.keys(applied ?? {}).sort()).toEqual(["id", "location", "version"]);
    expect(applied?.location).toBe("footer");
    expect(applied?.attributes).toBeUndefined();
  });

  it("pins the hosted runtime with a SHA-256 SRI of the exact uploaded bytes (Webflow's integrityHash format)", async () => {
    await sync();
    expect(captured.source.length).toBeGreaterThan(0);
    expect(captured.integrity).toMatch(/^sha256-[A-Za-z0-9+/]{43}=$/);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(captured.source));
    expect(captured.integrity).toBe(`sha256-${Buffer.from(digest).toString("base64")}`);
  });

  it("unchanged source → zero upload and zero register calls on every later sync", async () => {
    await sync();
    const afterFirst = { ...site.counts };

    // Five more syncs, exactly as a real editing session would fire them (composer save, rename, delete, …).
    for (let i = 0; i < 5; i++) {
      await sync();
    }

    expect(site.counts.createAsset).toBe(afterFirst.createAsset);
    expect(site.counts.upload).toBe(afterFirst.upload);
    expect(site.counts.register).toBe(afterFirst.register);
    // No redundant page custom-code rewrite either.
    expect(site.counts.putPageCode).toBe(afterFirst.putPageCode);
    expect(site.registered).toHaveLength(1);
  });

  it("changed source → exactly one upload and one register", async () => {
    await sync();

    // Simulate a new extension build: the page's applied entry (and the registration behind it) carry a hash that no
    // longer matches the source about to be uploaded.
    const applied = appliedBeaconScript();
    const row = site.registered.find((r) => r.id === applied?.id);
    if (applied && row) {
      applied.version = "0.1.0+beacon.deadbeef";
      row.version = applied.version;
      row.hostedLocation = "https://cdn.prod.website-files.com/codalyn-beacon-runtime-deadbeef.js";
    }

    await sync();
    expect(site.counts.createAsset).toBe(4);
    expect(site.counts.upload).toBe(4);
    expect(site.counts.register).toBe(2);
    expect(site.counts.putPageCode).toBe(2);

    // …and it settles again: the now-current hash makes the next sync a no-op.
    await sync();
    expect(site.counts.register).toBe(2);
  });

  it("registry-known entry whose version carries no build tag (Webflow echoing a normalized version) → resolved through the registry, no re-register", async () => {
    await sync();
    const applied = appliedBeaconScript();
    if (applied) {
      applied.version = "0.1.0";
    }

    await sync();
    expect(site.counts.register).toBe(1);
    expect(site.counts.putPageCode).toBe(1);
  });

  it("entry with no build tag, no legacy marker and a registry the sync cannot read → treated as changed (fails toward re-registering)", async () => {
    await sync();
    const applied = appliedBeaconScript();
    if (applied) {
      applied.version = "0.1.0";
    }
    site.registryUnavailable = true;

    await sync();
    expect(site.counts.register).toBe(2);
  });

  it("garbled version build tag with an unreadable registry → treated as changed (fails toward re-registering)", async () => {
    for (const garbled of ["", "   ", "not-a-version", "0.1.0+beacon.zzzzzzzz", "0.1.0+beacon.1726000000000"]) {
      site = freshSite();
      await sync();
      const applied = appliedBeaconScript();
      if (applied) {
        applied.version = garbled;
      }
      site.registryUnavailable = true;
      await sync();
      expect(site.counts.register).toBe(2);
    }
  });

  it("legacy-attribute page entry (pre-2026-09-26 build) migrates through one PUT: no upload, no registration, attributes gone, other scripts untouched", async () => {
    await sync();
    const applied = appliedBeaconScript();
    const hash = readBeaconRuntimeHashFromVersion(applied?.version);
    expect(hash).not.toBeNull();
    if (applied && hash) {
      applied.attributes = legacyAttributes(hash);
    }
    const analytics: PageScript = {
      id: "analytics",
      location: "header",
      version: "2.0.0",
      attributes: { "data-x": "1" },
    };
    site.pageScripts.unshift(analytics);
    const before = { ...site.counts };

    await sync();
    expect(site.counts.register).toBe(before.register);
    expect(site.counts.createAsset).toBe(before.createAsset);
    expect(site.counts.upload).toBe(before.upload);
    expect(site.counts.putPageCode).toBe(before.putPageCode + 1);
    expect(site.pageScripts).toEqual([analytics, { id: applied?.id, location: "footer", version: applied?.version }]);

    // …and it settles: the migrated entry is the canonical shape, so the next sync is a no-op.
    await sync();
    expect(site.counts.putPageCode).toBe(before.putPageCode + 1);
    expect(site.counts.register).toBe(before.register);
  });

  it("legacy entry whose version predates the content-derived tag (`+beacon.<timestamp>`) still migrates by marker + registry, never re-registers", async () => {
    await sync();
    const applied = appliedBeaconScript();
    const hash = readBeaconRuntimeHashFromVersion(applied?.version);
    const row = site.registered.find((r) => r.id === applied?.id);
    if (applied && row && hash) {
      applied.version = "0.1.0+beacon.1726000000000";
      row.version = applied.version;
      applied.attributes = legacyAttributes(hash);
    }

    await sync();
    expect(site.counts.register).toBe(1);
    expect(site.counts.putPageCode).toBe(2);
    expect(appliedBeaconScript()).toEqual({
      id: applied?.id,
      location: "footer",
      version: "0.1.0+beacon.1726000000000",
    });

    await sync();
    expect(site.counts.register).toBe(1);
    expect(site.counts.putPageCode).toBe(2);
  });

  it("legacy entry whose marker hash is a different build → re-registers (a stale runtime is never left on the page)", async () => {
    await sync();
    const applied = appliedBeaconScript();
    const row = site.registered.find((r) => r.id === applied?.id);
    if (applied && row) {
      applied.version = "0.1.0+beacon.1726000000000";
      row.version = applied.version;
      row.hostedLocation = "https://cdn.prod.website-files.com/codalyn-beacon-runtime-deadbeef.js";
      applied.attributes = legacyAttributes("deadbeef");
    }

    await sync();
    expect(site.counts.register).toBe(2);
    expect(beaconScriptsOnPage()).toHaveLength(1);
    expect(appliedBeaconScript()?.attributes).toBeUndefined();
  });

  it("force re-registers even when the applied runtime already matches", async () => {
    await sync();
    expect(site.counts.register).toBe(1);

    await sync({ force: true });
    expect(site.counts.register).toBe(2);
    expect(site.counts.upload).toBe(4);
  });

  it("keeps exactly one beacon runtime on the page across many syncs", async () => {
    await sync();
    for (let i = 0; i < 4; i++) {
      await sync({ force: true });
    }
    expect(beaconScriptsOnPage()).toHaveLength(1);
    expect(site.pageScripts).toHaveLength(1);
  });

  it("uploads an identity source map beside the runtime and points the runtime's last line at it — no trailing newline", async () => {
    await sync();
    expect(captured.uploads.map((u) => u.name)).toEqual([
      expect.stringMatching(/^codalyn-beacon-runtime-[0-9a-f]{8}\.map\.json$/),
      expect.stringMatching(/^codalyn-beacon-runtime-[0-9a-f]{8}\.js$/),
    ]);
    const [map, js] = captured.uploads;
    const mapUrl = `https://cdn.prod.website-files.com/${map.name}`;
    expect(js.text.endsWith(`\n//# sourceMappingURL=${mapUrl}`)).toBe(true);
    expect(js.text.endsWith("\n")).toBe(false);
    const parsed = JSON.parse(map.text) as { version: number; file: string; sourcesContent: string[] };
    expect(parsed.version).toBe(3);
    expect(parsed.file).toBe(js.name);
    // The served file minus its last line is exactly what the map carries as source.
    expect(parsed.sourcesContent[0]).toBe(js.text.slice(0, js.text.lastIndexOf("\n")));
    // The registered SRI covers the bytes that ship, trailer included.
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(js.text));
    expect(captured.integrity).toBe(`sha256-${Buffer.from(digest).toString("base64")}`);
  });

  it("reuses the site's existing source map for the same build instead of uploading a duplicate", async () => {
    await sync();
    const [firstMap] = captured.uploads;
    const reusedUrl = `https://cdn.prod.website-files.com/reused_${firstMap.name}`;
    site.assets = [{ id: "map-asset", hostedUrl: reusedUrl, originalFileName: firstMap.name }];
    captured.uploads = [];
    const before = { ...site.counts };

    await sync({ force: true });

    expect(site.counts.createAsset).toBe(before.createAsset + 1);
    expect(site.counts.upload).toBe(before.upload + 1);
    expect(captured.uploads.map((u) => u.name)).toEqual([expect.stringMatching(/\.js$/)]);
    expect(captured.uploads[0].text.endsWith(`\n//# sourceMappingURL=${reusedUrl}`)).toBe(true);
  });

  it("still registers the runtime, without a map pointer, when Webflow refuses the map asset (best-effort map)", async () => {
    site.refuseSourceMapAssets = true;
    await sync();
    expect(site.counts.register).toBe(1);
    expect(site.counts.upload).toBe(1);
    expect(captured.uploads.map((u) => u.name)).toEqual([expect.stringMatching(/\.js$/)]);
    expect(captured.source).not.toContain("sourceMappingURL");
    expect(captured.source.endsWith("\n")).toBe(false);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(captured.source));
    expect(captured.integrity).toBe(`sha256-${Buffer.from(digest).toString("base64")}`);
  });
});

describe("getCmsSlotPageRuntimeSyncStatus without page-entry attributes", () => {
  it("reports synced from the registered version alone — one page GET, no registry read", async () => {
    await sync();
    const before = { ...site.counts };
    await expect(status()).resolves.toEqual({ synced: true });
    expect(site.counts.getPageCode).toBe(before.getPageCode + 1);
    expect(site.counts.getRegistry).toBe(before.getRegistry);
  });

  it("resolves a registry-known entry whose version carries no build tag through the registry", async () => {
    await sync();
    const applied = appliedBeaconScript();
    if (applied) {
      applied.version = "0.1.0";
    }
    const before = { ...site.counts };
    await expect(status()).resolves.toEqual({ synced: true });
    expect(site.counts.getRegistry).toBe(before.getRegistry + 1);
  });

  it("still reports synced for a legacy-attribute entry (page synced by an older build, not yet migrated)", async () => {
    await sync();
    const applied = appliedBeaconScript();
    const hash = readBeaconRuntimeHashFromVersion(applied?.version);
    if (applied && hash) {
      applied.version = "0.1.0+beacon.1726000000000";
      applied.attributes = legacyAttributes(hash);
    }
    site.registryUnavailable = true;
    await expect(status()).resolves.toEqual({ synced: true });
  });

  it("reports out of date when the applied entry is a different build, and missing when the page has no runtime", async () => {
    await sync();
    const applied = appliedBeaconScript();
    const row = site.registered.find((r) => r.id === applied?.id);
    if (applied && row) {
      applied.version = "0.1.0+beacon.deadbeef";
      row.hostedLocation = "https://cdn.prod.website-files.com/codalyn-beacon-runtime-deadbeef.js";
    }
    await expect(status()).resolves.toMatchObject({ synced: false, reason: expect.stringMatching(/out of date/) });

    site.pageScripts = [{ id: "someone-elses", location: "footer", version: "1.0.0" }];
    await expect(status()).resolves.toMatchObject({ synced: false, reason: expect.stringMatching(/No beacon script/) });
  });
});
