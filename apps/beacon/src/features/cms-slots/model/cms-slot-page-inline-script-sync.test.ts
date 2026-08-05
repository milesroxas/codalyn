import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const UPLOAD_URL = "https://s3.amazonaws.com/webflow-prod-assets";

type PageScript = {
  id: string;
  location: string;
  version: string;
  attributes?: Record<string, string>;
};

/** Mutable fake of the customer's site as the Data API would report it. */
type FakeSite = {
  pageScripts: PageScript[];
  registered: { id: string; displayName: string; hostedLocation: string }[];
  counts: { register: number; createAsset: number; upload: number; putPageCode: number; getPageCode: number };
};

let site: FakeSite;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function body<T>(init: RequestInit | undefined): T {
  return JSON.parse(String(init?.body ?? "{}")) as T;
}

/** Minimal `METHOD /path` router over the Tower proxy endpoints `cms-slot-page-inline-script` calls. */
const TOWER_ROUTES: Record<string, (init: RequestInit | undefined) => Response> = {
  [`POST /api/v2/webflow/sites/${SITE_ID}/assets`]: (init) => {
    site.counts.createAsset += 1;
    const { fileName } = body<{ fileName?: string }>(init);
    return json({
      uploadUrl: UPLOAD_URL,
      uploadDetails: { key: "k", policy: "p" },
      hostedUrl: `https://cdn.prod.website-files.com/${fileName ?? "runtime.js"}`,
    });
  },
  [`GET /api/v2/webflow/sites/${SITE_ID}/assets`]: () =>
    json({ assets: [], pagination: { limit: 100, offset: 0, total: 0 } }),
  [`POST /api/v2/webflow/sites/${SITE_ID}/registered_scripts/hosted`]: (init) => {
    site.counts.register += 1;
    const { hostedLocation, version } = body<{ hostedLocation?: string; version?: string }>(init);
    const id = `reg-${site.counts.register}`;
    site.registered.push({ id, displayName: "CodalynBeaconRuntime", hostedLocation: String(hostedLocation ?? "") });
    return json({ id, version: String(version ?? "1.0.0") });
  },
  [`GET /api/v2/webflow/sites/${SITE_ID}/registered_scripts`]: () =>
    json({
      registeredScripts: site.registered,
      pagination: { limit: 100, offset: 0, total: site.registered.length },
    }),
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

/** The applied footer entry, as the runtime-sync status check would read it. */
function appliedBeaconScript(): PageScript | undefined {
  return site.pageScripts.find((s) => s.attributes?.["data-codalyn-beacon"] === "runtime");
}

beforeEach(() => {
  vi.useFakeTimers();
  site = {
    pageScripts: [],
    registered: [],
    counts: { register: 0, createAsset: 0, upload: 0, putPageCode: 0, getPageCode: 0 },
  };
  vi.stubGlobal("webflow", {
    getSiteInfo: async () => ({ siteId: SITE_ID }),
    getCurrentPage: async () => ({ id: PAGE_ID }),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url) === UPLOAD_URL) {
        site.counts.upload += 1;
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

describe("syncCmsSlotPageInlineScript registration budget", () => {
  it("registers exactly once on the first sync of a page", async () => {
    await sync();
    expect(site.counts.createAsset).toBe(1);
    expect(site.counts.upload).toBe(1);
    expect(site.counts.register).toBe(1);
    expect(site.counts.putPageCode).toBe(1);
    expect(appliedBeaconScript()?.attributes?.["data-codalyn-beacon-src-hash"]).toMatch(/^[0-9a-f]{8}$/);
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

    // Simulate a new extension build: the applied hash no longer matches the source about to be uploaded.
    const applied = appliedBeaconScript();
    if (applied?.attributes) {
      applied.attributes["data-codalyn-beacon-src-hash"] = "deadbeef";
    }

    await sync();
    expect(site.counts.createAsset).toBe(2);
    expect(site.counts.upload).toBe(2);
    expect(site.counts.register).toBe(2);
    expect(site.counts.putPageCode).toBe(2);

    // …and it settles again: the now-current hash makes the next sync a no-op.
    await sync();
    expect(site.counts.register).toBe(2);
  });

  it("missing hash attribute → treated as changed (fails toward re-registering)", async () => {
    await sync();
    const applied = appliedBeaconScript();
    if (applied?.attributes) {
      delete applied.attributes["data-codalyn-beacon-src-hash"];
    }

    await sync();
    expect(site.counts.register).toBe(2);
  });

  it("garbled hash attribute → treated as changed (fails toward re-registering)", async () => {
    for (const garbled of ["", "   ", "not-a-hash"]) {
      site = {
        pageScripts: [],
        registered: [],
        counts: { register: 0, createAsset: 0, upload: 0, putPageCode: 0, getPageCode: 0 },
      };
      await sync();
      const applied = appliedBeaconScript();
      if (applied?.attributes) {
        applied.attributes["data-codalyn-beacon-src-hash"] = garbled;
      }
      await sync();
      expect(site.counts.register).toBe(2);
    }
  });

  it("missing marker attribute → treated as changed (never silently skips an unmarked page)", async () => {
    await sync();
    const applied = appliedBeaconScript();
    if (applied) {
      applied.attributes = { "data-codalyn-beacon-src-hash": "whatever" };
    }

    await sync();
    expect(site.counts.register).toBe(2);
  });

  it("force re-registers even when the applied runtime already matches", async () => {
    await sync();
    expect(site.counts.register).toBe(1);

    await sync({ force: true });
    expect(site.counts.register).toBe(2);
    expect(site.counts.upload).toBe(2);
  });

  it("keeps exactly one beacon runtime on the page across many syncs", async () => {
    await sync();
    for (let i = 0; i < 4; i++) {
      await sync({ force: true });
    }
    const beacons = site.pageScripts.filter((s) => s.attributes?.["data-codalyn-beacon"] === "runtime");
    expect(beacons).toHaveLength(1);
    expect(site.pageScripts).toHaveLength(1);
  });
});
