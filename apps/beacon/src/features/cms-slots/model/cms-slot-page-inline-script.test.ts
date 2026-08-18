import { afterEach, describe, expect, it, vi } from "vitest";
import { beaconPropDebugStubSource } from "@/features/cms-slots/model/cms-slot-beacon-debug";
import {
  CMS_SLOT_COND_ATTR,
  CMS_SLOT_CONTENT_ATTR,
  CMS_SLOT_PUBLISH_PLACEHOLDER_URL,
  WEBFLOW_CONDITION_INVISIBLE_CLASS,
} from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import { CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_INLINE_KEYS } from "@/features/cms-slots/model/cms-slot-list-target-designer-placeholder";
import { CMS_SLOT_LIST_RENDER_LAYOUT_STYLE_NAME } from "@/features/cms-slots/model/cms-slot-list-target-slot-style";
import {
  CMS_SLOT_RUNTIME_SAFETY_REVEAL_MS,
  cmsSlotRuntimeScriptVersion,
  decideCmsSlotRuntimeSyncAction,
  describeTowerFailure,
  getCmsSlotPageInlineScriptSource,
  isAllowedAssetUploadUrl,
  isBeaconRuntimeAssetFileName,
  mergePageScriptsWithBeaconRuntime,
  normalizeBeaconRuntimeAssetRow,
  normalizeHostedAssetUrl,
  PURGE_MAX_PAGES_SCANNED,
  planBoundedPageScan,
  selectBeaconRuntimeAssetIdsToPurge,
  withoutAnyBeaconRuntimeScripts,
} from "@/features/cms-slots/model/cms-slot-page-inline-script";

type PageScript = {
  id: string;
  location: string;
  version: string;
  attributes?: Record<string, string>;
};

const beaconFooter = (id: string, attrs?: Record<string, string>): PageScript => ({
  id,
  location: "footer",
  version: "1.0.0",
  attributes: attrs,
});
const isBeaconScript = (s: PageScript, registeredIds: Set<string>): boolean =>
  s.attributes?.["data-codalyn-beacon"] === "runtime" || registeredIds.has(s.id);

function runCmsSlotBeaconRuntime(doc: Document): void {
  const win = doc.defaultView;
  if (win == null) {
    throw new Error("document.defaultView required");
  }
  const source = getCmsSlotPageInlineScriptSource();
  const run = new Function("document", "window", "addEventListener", "globalThis", source) as (
    document: Document,
    window: Window,
    addEventListener: Window["addEventListener"],
    globalRef: Window
  ) => void;
  run(doc, win, win.addEventListener.bind(win), win);
}

describe("getCmsSlotPageInlineScriptSource", () => {
  it("parses in JS", () => {
    const s = getCmsSlotPageInlineScriptSource();
    expect(() => {
      void new Function("document", "window", "addEventListener", s);
    }).not.toThrow();
  });

  it("strips designer placeholder inline styles on list target reveal", () => {
    const s = getCmsSlotPageInlineScriptSource();
    for (const key of CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_INLINE_KEYS) {
      expect(s).toContain(`"${key}"`);
    }
    expect(s).toContain("removeProperty");
  });

  it("applies display contents layout on list target reveal", () => {
    const s = getCmsSlotPageInlineScriptSource();
    expect(s).toContain(`classList.add("${CMS_SLOT_LIST_RENDER_LAYOUT_STYLE_NAME}")`);
    expect(s).toContain('setProperty("display","contents","important")');
  });

  it("reads the v3 content and conditional attributes", () => {
    const s = getCmsSlotPageInlineScriptSource();
    expect(s).toContain(`querySelectorAll("[${CMS_SLOT_CONTENT_ATTR}]")`);
    expect(s).toContain(`getAttribute("${CMS_SLOT_CONTENT_ATTR}")`);
    expect(s).toContain(`getAttribute("${CMS_SLOT_COND_ATTR}")`);
  });

  it("production debug stub parses and no-ops every debug fn the runtime invokes", () => {
    // Production ships this stub instead of the styled HUD. It must define every debug fn the runtime body calls so
    // the runtime parses and runs without the panel; a missing one would break the live (production) runtime.
    const stub = beaconPropDebugStubSource();
    expect(() => new Function(stub)).not.toThrow();
    for (const fn of ["bLog", "bDbgBump", "bDbgBindKeys", "bDbgRuntimeInfo"]) {
      expect(stub).toContain(`function ${fn}(`);
    }
    expect(stub).not.toContain("#codalyn-beacon-debug");
  });
});

describe("beacon runtime asset cleanup helpers", () => {
  it("recognizes codalyn beacon runtime asset filenames", () => {
    expect(isBeaconRuntimeAssetFileName("codalyn-beacon-runtime-deadbeef.js")).toBe(true);
    expect(isBeaconRuntimeAssetFileName("runtime.js")).toBe(false);
  });

  it("normalizes hosted asset URLs for comparison", () => {
    expect(normalizeHostedAssetUrl("https://cdn.example.com/a.js?x=1")).toBe("https://cdn.example.com/a.js");
    expect(normalizeHostedAssetUrl("https://cdn.example.com/a.js/")).toBe("https://cdn.example.com/a.js");
  });

  it("normalizes canonical and alternate Webflow asset list shapes", () => {
    expect(
      normalizeBeaconRuntimeAssetRow({
        id: "asset-1",
        hostedUrl: "https://cdn.example.com/codalyn-beacon-runtime-abc.js",
        originalFileName: "codalyn-beacon-runtime-abc.js",
      })
    ).toEqual({
      id: "asset-1",
      hostedUrl: "https://cdn.example.com/codalyn-beacon-runtime-abc.js",
      originalFileName: "codalyn-beacon-runtime-abc.js",
    });
    expect(
      normalizeBeaconRuntimeAssetRow({
        id: "asset-2",
        url: "https://cdn.example.com/codalyn-beacon-runtime-old.js",
        displayName: "63e5889e_codalyn-beacon-runtime-old.js",
      })
    ).toEqual({
      id: "asset-2",
      hostedUrl: "https://cdn.example.com/codalyn-beacon-runtime-old.js",
      originalFileName: "codalyn-beacon-runtime-old.js",
    });
    expect(normalizeBeaconRuntimeAssetRow({ id: "asset-3", hostedUrl: "https://cdn.example.com/logo.png" })).toBeNull();
    expect(normalizeBeaconRuntimeAssetRow(null)).toBeNull();
  });

  it("selects only unreferenced beacon runtime assets", () => {
    const assets = [
      {
        id: "keep",
        hostedUrl: "https://cdn.example.com/codalyn-beacon-runtime-abc.js",
        originalFileName: "codalyn-beacon-runtime-abc.js",
      },
      {
        id: "drop",
        hostedUrl: "https://cdn.example.com/codalyn-beacon-runtime-old.js",
        originalFileName: "codalyn-beacon-runtime-old.js",
      },
      {
        id: "ignore",
        hostedUrl: "https://cdn.example.com/logo.png",
        originalFileName: "logo.png",
      },
    ];
    expect(
      selectBeaconRuntimeAssetIdsToPurge({
        assets,
        appliedHostedUrls: ["https://cdn.example.com/codalyn-beacon-runtime-abc.js?cache=1"],
      })
    ).toEqual(["drop"]);
  });
});

describe("beacon runtime page-script dedup (root-cause guard)", () => {
  // The published-page bug was two runtime scripts co-existing and stomping each other. These lock the invariant that
  // applying the runtime always leaves exactly one beacon footer script, no matter what was on the page before.
  const newScript = beaconFooter("new-runtime", {
    "data-codalyn-beacon": "runtime",
    "data-codalyn-beacon-src-hash": "c7b4796e",
  });

  it("strips a stale beacon script that carries the current marker", () => {
    const existing = [beaconFooter("stale-marked", { "data-codalyn-beacon": "runtime" })];
    const merged = mergePageScriptsWithBeaconRuntime(existing, newScript, new Set());
    expect(merged.map((s) => s.id)).toEqual(["new-runtime"]);
  });

  it("strips a stale beacon script with NO/old marker but a registered runtime id (the bug: 5617bd4d)", () => {
    // This is exactly what survived before: applied under an older scheme so the marker filter missed it.
    const existing = [beaconFooter("5617bd4d", undefined)];
    const merged = mergePageScriptsWithBeaconRuntime(existing, newScript, new Set(["5617bd4d"]));
    expect(merged.map((s) => s.id)).toEqual(["new-runtime"]);
  });

  it("preserves non-beacon scripts and their order, appending the runtime last", () => {
    const analytics = beaconFooter("analytics", { src: "ga.js" });
    const consent = beaconFooter("consent", undefined);
    const merged = mergePageScriptsWithBeaconRuntime(
      [analytics, beaconFooter("old-beacon", { "data-codalyn-beacon": "runtime" }), consent],
      newScript,
      new Set()
    );
    expect(merged.map((s) => s.id)).toEqual(["analytics", "consent", "new-runtime"]);
  });

  it("invariant: exactly one beacon footer script remains for any prior page state", () => {
    const priorStates: PageScript[][] = [
      [],
      [beaconFooter("a", { "data-codalyn-beacon": "runtime" })],
      [beaconFooter("a", { "data-codalyn-beacon": "runtime" }), beaconFooter("b", undefined)],
      [beaconFooter("x", undefined), beaconFooter("y", { src: "third-party.js" })],
    ];
    const registeredIds = new Set(["b"]); // 'b' is a registered runtime with no marker
    for (const existing of priorStates) {
      const merged = mergePageScriptsWithBeaconRuntime(existing, newScript, registeredIds);
      expect(merged.filter((s) => isBeaconScript(s, registeredIds)).length).toBe(1);
      expect(merged[merged.length - 1]?.id).toBe("new-runtime");
    }
  });

  it("withoutAnyBeaconRuntimeScripts removes by marker AND by registered id together", () => {
    const kept = withoutAnyBeaconRuntimeScripts(
      [
        beaconFooter("marked", { "data-codalyn-beacon": "runtime" }),
        beaconFooter("by-id", undefined),
        beaconFooter("keep", { src: "x.js" }),
      ],
      new Set(["by-id"])
    );
    expect(kept.map((s) => s.id)).toEqual(["keep"]);
  });
});

describe("runtime asset purge protects the just-synced asset", () => {
  // Read-after-write lag once let the post-sync purge delete the freshly uploaded runtime. The just-synced URL is
  // unioned into the applied set, so it must never be selected for deletion even if the page-applied read misses it.
  it("keeps the just-synced asset and drops only the genuinely unreferenced stale one", () => {
    const assets = [
      {
        id: "fresh",
        hostedUrl: "https://cdn.example.com/codalyn-beacon-runtime-new.js",
        originalFileName: "codalyn-beacon-runtime-new.js",
      },
      {
        id: "stale",
        hostedUrl: "https://cdn.example.com/codalyn-beacon-runtime-old.js",
        originalFileName: "codalyn-beacon-runtime-old.js",
      },
    ];
    // Simulate the protected union: only the just-synced URL is known-applied (page read hasn't caught up yet).
    const toPurge = selectBeaconRuntimeAssetIdsToPurge({
      assets,
      appliedHostedUrls: ["https://cdn.example.com/codalyn-beacon-runtime-new.js"],
    });
    expect(toPurge).toEqual(["stale"]);
  });
});

/** @vitest-environment jsdom */
describe("cms slot beacon runtime (published DOM)", () => {
  const LIST = "beacon-nested-clone-test";

  function mountListFixture(payloadJson: string): { target: HTMLDivElement } {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const row = doc.createElement("div");
    row.className = "row-template";
    const nested = doc.createElement("div");
    nested.className = "nested-component";
    const title = doc.createElement("h2");
    title.setAttribute(CMS_SLOT_CONTENT_ATTR, "parent-title");
    title.textContent = "Designer placeholder";
    const inner = doc.createElement("div");
    const imgSlot = doc.createElement("span");
    imgSlot.setAttribute(CMS_SLOT_CONTENT_ATTR, "parent-img");
    imgSlot.setAttribute(CMS_SLOT_COND_ATTR, "1");
    imgSlot.textContent = "img placeholder";
    inner.appendChild(imgSlot);
    nested.appendChild(title);
    nested.appendChild(inner);
    row.appendChild(nested);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = payloadJson;

    doc.body.append(source, target);
    return { target };
  }

  it("renders nothing when payload has empty i (Composer order cleared)", () => {
    const { target } = mountListFixture(JSON.stringify({ v: 3, i: [], p: [] }));
    runCmsSlotBeaconRuntime(document);
    expect(target.children.length).toBe(0);
  });

  it("renders nothing when list target text is empty or invalid (Composer is the only clone source)", () => {
    // Never fall back to cloning the Designer pool: a missing/garbled payload must fail safe to an empty slot, not
    // surface wrong rows (the failure mode that masked the stale-runtime bug).
    for (const payloadJson of ["", "not-json", '{"v":2,"i":[0]}', '{"v":3}', "[]"]) {
      const doc = document;
      const source = doc.createElement("div");
      source.setAttribute("data-target", "beacons");
      source.setAttribute("data-list", LIST);
      const row = doc.createElement("div");
      row.textContent = "Designer row";
      source.appendChild(row);

      const target = doc.createElement("div");
      target.setAttribute("data-beacon-target", "list");
      target.setAttribute("data-list", LIST);
      target.textContent = payloadJson;
      doc.body.append(source, target);

      runCmsSlotBeaconRuntime(doc);
      expect(target.children.length).toBe(0);
      doc.body.innerHTML = "";
    }
  });

  it("is idempotent: a second runtime pass does not re-clone or stomp an already-rendered target", () => {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);
    const poolRow = doc.createElement("div");
    poolRow.className = "split-content";
    const title = doc.createElement("h2");
    title.setAttribute(CMS_SLOT_CONTENT_ATTR, "title");
    poolRow.appendChild(title);
    source.appendChild(poolRow);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({ v: 3, i: [0, 0], p: [{ title: "a" }, { title: "b" }] });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc); // first runtime renders
    runCmsSlotBeaconRuntime(doc); // a stray second runtime must be a no-op

    expect(target.getAttribute("data-cb-rendered")).toBe("1");
    expect(target.children.length).toBe(2);
    expect(
      Array.from(target.children).map(
        (row) => row.querySelector<HTMLHeadingElement>(`[${CMS_SLOT_CONTENT_ATTR}='title']`)?.textContent
      )
    ).toEqual(["a", "b"]);
    doc.body.innerHTML = "";
  });

  it("clones each component type from distinct hidden-list DOM children", () => {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const spacer = doc.createElement("div");
    spacer.className = "non-component-spacer";
    source.appendChild(spacer);

    const rowA = doc.createElement("div");
    rowA.className = "type-a";
    rowA.textContent = "A";
    const rowB = doc.createElement("div");
    rowB.className = "type-b";
    rowB.textContent = "B";
    source.append(rowA, rowB);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 3,
      i: [1, 2],
      p: [{}, {}],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    expect(target.children.length).toBe(2);
    expect(target.children[0]?.className).toBe("type-a");
    expect(target.children[1]?.className).toBe("type-b");
  });

  it("clones one pool child N times in Composer order with distinct per-row content (not limited to pool size)", () => {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    // Designer pool holds a SINGLE "Split Content" source child. Its name is editor-only; cloning keys off index.
    const poolRow = doc.createElement("div");
    poolRow.className = "split-content";
    const title = doc.createElement("h2");
    title.setAttribute(CMS_SLOT_CONTENT_ATTR, "title");
    title.textContent = "Designer placeholder";
    poolRow.appendChild(title);
    source.appendChild(poolRow);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    // Composer used the one component three times, in order, each with its own content.
    target.textContent = JSON.stringify({
      v: 3,
      i: [0, 0, 0],
      p: [{ title: "test 1" }, { title: "split 2" }, { title: "third" }],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    // Three clones from a one-child pool: count tracks Composer layout, not pool size.
    expect(target.children.length).toBe(3);
    const titles = Array.from(target.children).map(
      (row) => row.querySelector<HTMLHeadingElement>(`[${CMS_SLOT_CONTENT_ATTR}='title']`)?.textContent
    );
    expect(titles).toEqual(["test 1", "split 2", "third"]);
    // Each cloned row is an independent node (deep clone), and the source pool is untouched.
    expect(target.children[0]).not.toBe(target.children[1]);
    expect(source.children.length).toBe(1);
    expect(source.querySelector("h2")?.textContent).toBe("Designer placeholder");
    doc.body.innerHTML = "";
  });

  it("clones repeated + reordered mixed types with the right per-row content", () => {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const split = doc.createElement("div");
    split.className = "split-content";
    const splitTitle = doc.createElement("h2");
    splitTitle.setAttribute(CMS_SLOT_CONTENT_ATTR, "title");
    split.appendChild(splitTitle);

    const banner = doc.createElement("div");
    banner.className = "banner";
    const bannerTitle = doc.createElement("h2");
    bannerTitle.setAttribute(CMS_SLOT_CONTENT_ATTR, "title");
    banner.appendChild(bannerTitle);

    source.append(split, banner); // pool: split=child 0, banner=child 1

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    // Composer order: banner, split, split — banner cloned from child 1, split twice from child 0.
    target.textContent = JSON.stringify({
      v: 3,
      i: [1, 0, 0],
      p: [{ title: "banner copy" }, { title: "split A" }, { title: "split B" }],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    expect(target.children.length).toBe(3);
    expect(Array.from(target.children).map((row) => row.className)).toEqual([
      "banner",
      "split-content",
      "split-content",
    ]);
    const titles = Array.from(target.children).map(
      (row) => row.querySelector<HTMLHeadingElement>(`[${CMS_SLOT_CONTENT_ATTR}='title']`)?.textContent
    );
    expect(titles).toEqual(["banner copy", "split A", "split B"]);
    doc.body.innerHTML = "";
  });

  it("deep-clones nested component markup and applies per-row props inside nested nodes", () => {
    const payload = JSON.stringify({
      v: 3,
      i: [0],
      p: [{ "parent-title": "Row A title" }],
    });
    const { target } = mountListFixture(payload);
    runCmsSlotBeaconRuntime(document);

    expect(target.children.length).toBe(1);
    const clonedRow = target.children[0];
    const nested = clonedRow?.querySelector(".nested-component");
    expect(nested).not.toBeNull();
    expect(nested).not.toBe(document.querySelector("[data-target=beacons] .nested-component"));

    const title = clonedRow?.querySelector<HTMLHeadingElement>(`[${CMS_SLOT_CONTENT_ATTR}='parent-title']`);
    expect(title?.textContent).toBe("Row A title");
    expect(title?.hasAttribute("hidden")).toBe(false);

    const imgSlot = clonedRow?.querySelector(`[${CMS_SLOT_CONTENT_ATTR}='parent-img']`);
    expect(imgSlot?.hasAttribute("hidden")).toBe(true);
  });

  it("leaves un-edited non-conditional content at its authored default (fail-open)", () => {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const row = doc.createElement("div");
    const title = doc.createElement("h2");
    title.setAttribute(CMS_SLOT_CONTENT_ATTR, "parent-title");
    title.textContent = "Authored default";
    row.appendChild(title);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({ v: 3, i: [0], p: [{}] });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedTitle = target.querySelector<HTMLHeadingElement>(`[${CMS_SLOT_CONTENT_ATTR}='parent-title']`);
    expect(clonedTitle?.textContent).toBe("Authored default");
    expect(clonedTitle?.hasAttribute("hidden")).toBe(false);
  });

  it("applies a Composer value when the cloned row root is itself the tagged element", () => {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const row = doc.createElement("div");
    row.setAttribute(CMS_SLOT_CONTENT_ATTR, "root-text");
    row.textContent = "Designer placeholder";
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({ v: 3, i: [0], p: [{ "root-text": "Composed value" }] });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedRoot = target.querySelector<HTMLDivElement>(`[${CMS_SLOT_CONTENT_ATTR}='root-text']`);
    expect(clonedRoot).not.toBeNull();
    expect(clonedRoot).toBe(target.children[0]);
    expect(clonedRoot?.textContent).toBe("Composed value");
    expect(clonedRoot?.hasAttribute("hidden")).toBe(false);
  });

  it("conceals an empty conditional row root without hiding the list target", () => {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const row = doc.createElement("a");
    row.setAttribute(CMS_SLOT_CONTENT_ATTR, "root-link");
    row.setAttribute(CMS_SLOT_COND_ATTR, "1");
    row.setAttribute("href", "#codalyn-beacon-publish-placeholder");
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({ v: 3, i: [0], p: [{}] });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedRoot = target.querySelector<HTMLAnchorElement>(`[${CMS_SLOT_CONTENT_ATTR}='root-link']`);
    expect(clonedRoot?.hasAttribute("hidden")).toBe(true);
    expect(target.classList.contains(WEBFLOW_CONDITION_INVISIBLE_CLASS)).toBe(false);
    expect(target.style.display).not.toBe("none");
  });

  it("clones the same nested template twice with independent prop payloads", () => {
    const payload = JSON.stringify({
      v: 3,
      i: [0, 0],
      p: [{ "parent-title": "First" }, { "parent-title": "Second" }],
    });
    const { target } = mountListFixture(payload);
    runCmsSlotBeaconRuntime(document);

    expect(target.children.length).toBe(2);
    const titles = [...target.querySelectorAll<HTMLHeadingElement>(`[${CMS_SLOT_CONTENT_ATTR}='parent-title']`)];
    expect(titles.map((el) => el.textContent)).toEqual(["First", "Second"]);
    expect(titles[0]).not.toBe(titles[1]);
  });

  it("applies nested image AVIF URL to picture/img inside cloned row", () => {
    const avif =
      "https://cdn.prod.website-files.com/6a19b630fc79ff670f827e0e/6a19bd9570056bbef3abe15a_cms-test-01.avif";
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const row = doc.createElement("div");
    const nested = doc.createElement("div");
    nested.className = "nested-component";
    const picture = doc.createElement("picture");
    const sourceEl = doc.createElement("source");
    sourceEl.setAttribute("srcset", CMS_SLOT_PUBLISH_PLACEHOLDER_URL);
    const img = doc.createElement("img");
    img.setAttribute(CMS_SLOT_CONTENT_ATTR, "card-image");
    img.setAttribute("src", CMS_SLOT_PUBLISH_PLACEHOLDER_URL);
    picture.append(sourceEl, img);
    nested.appendChild(picture);
    row.appendChild(nested);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 3,
      i: [0],
      p: [{ "card-image": avif }],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedImg = target.querySelector<HTMLImageElement>(`[${CMS_SLOT_CONTENT_ATTR}='card-image']`);
    const clonedSource = target.querySelector<HTMLSourceElement>("picture source");
    expect(clonedImg?.getAttribute("src")).toBe(avif);
    expect(clonedSource?.getAttribute("srcset")).toBe(avif);
    expect(clonedSource?.getAttribute("type")).toBe("image/avif");
    expect(clonedImg?.hasAttribute("hidden")).toBe(false);
  });

  it("reveals Webflow conditional visibility when Composer supplies the bound link", () => {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const row = doc.createElement("div");
    const wrap = doc.createElement("div");
    wrap.className = WEBFLOW_CONDITION_INVISIBLE_CLASS;
    wrap.style.display = "none";
    const link = doc.createElement("a");
    link.setAttribute(CMS_SLOT_CONTENT_ATTR, "cta-link");
    link.setAttribute(CMS_SLOT_COND_ATTR, "1");
    link.setAttribute("href", "#codalyn-beacon-publish-placeholder");
    wrap.appendChild(link);
    row.appendChild(wrap);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 3,
      i: [0],
      p: [{ "cta-link": "https://example.com/go" }],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedLink = target.querySelector<HTMLAnchorElement>(`a[${CMS_SLOT_CONTENT_ATTR}='cta-link']`);
    expect(clonedLink?.getAttribute("href")).toBe("https://example.com/go");
    expect(clonedLink?.hasAttribute("hidden")).toBe(false);
    expect(clonedLink?.parentElement?.classList.contains(WEBFLOW_CONDITION_INVISIBLE_CLASS)).toBe(false);
    expect(clonedLink?.parentElement?.style.display).toBe("");
  });

  it("reveals nested conditional visibility through ancestor wrappers inside a cloned row", () => {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const row = doc.createElement("div");
    const nested = doc.createElement("div");
    nested.className = "nested-component";
    const wrap = doc.createElement("div");
    wrap.className = WEBFLOW_CONDITION_INVISIBLE_CLASS;
    wrap.style.display = "none";
    const link = doc.createElement("a");
    link.setAttribute(CMS_SLOT_CONTENT_ATTR, "card-link");
    link.setAttribute(CMS_SLOT_COND_ATTR, "1");
    link.setAttribute("href", "#codalyn-beacon-publish-placeholder");
    wrap.appendChild(link);
    nested.appendChild(wrap);
    row.appendChild(nested);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 3,
      i: [0],
      p: [{ "card-link": "https://example.com/nested" }],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedLink = target.querySelector<HTMLAnchorElement>(
      `.nested-component a[${CMS_SLOT_CONTENT_ATTR}='card-link']`
    );
    expect(clonedLink?.getAttribute("href")).toBe("https://example.com/nested");
    expect(clonedLink?.parentElement?.classList.contains(WEBFLOW_CONDITION_INVISIBLE_CLASS)).toBe(false);
  });

  it("conceals empty conditionals while leaving plain content visible", () => {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const row = doc.createElement("div");
    const title = doc.createElement("h2");
    title.textContent = "Card title";
    const wrap = doc.createElement("div");
    const link = doc.createElement("a");
    link.setAttribute(CMS_SLOT_CONTENT_ATTR, "cta-link");
    link.setAttribute(CMS_SLOT_COND_ATTR, "1");
    link.setAttribute("href", "#codalyn-beacon-publish-placeholder");
    link.textContent = "Click me";
    wrap.appendChild(link);
    row.appendChild(title);
    row.appendChild(wrap);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 3,
      i: [0],
      p: [{}],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedTitle = target.querySelector<HTMLHeadingElement>("h2");
    const clonedLink = target.querySelector<HTMLAnchorElement>(`a[${CMS_SLOT_CONTENT_ATTR}='cta-link']`);
    expect(clonedTitle?.hasAttribute("hidden")).toBe(false);
    expect(clonedTitle?.textContent).toBe("Card title");
    expect(clonedLink?.hasAttribute("hidden")).toBe(true);
    expect(clonedLink?.hasAttribute("href")).toBe(false);
    expect(clonedLink?.parentElement?.classList.contains(WEBFLOW_CONDITION_INVISIBLE_CLASS)).toBe(true);
    expect(clonedLink?.parentElement?.style.display).toBe("none");
  });

  it("conceals only the conditional wrapper inside a nested component, not the whole component", () => {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const row = doc.createElement("div");
    const nested = doc.createElement("div");
    nested.className = "nested-component";
    const title = doc.createElement("h3");
    title.textContent = "Nested title";
    const wrap = doc.createElement("div");
    wrap.className = WEBFLOW_CONDITION_INVISIBLE_CLASS;
    const link = doc.createElement("a");
    link.setAttribute(CMS_SLOT_CONTENT_ATTR, "card-link");
    link.setAttribute(CMS_SLOT_COND_ATTR, "1");
    link.setAttribute("href", "#codalyn-beacon-publish-placeholder");
    wrap.appendChild(link);
    nested.appendChild(title);
    nested.appendChild(wrap);
    row.appendChild(nested);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 3,
      i: [0],
      p: [{}],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const nestedRoot = target.querySelector<HTMLDivElement>(".nested-component");
    const nestedTitle = nestedRoot?.querySelector<HTMLHeadingElement>("h3");
    const clonedLink = target.querySelector<HTMLAnchorElement>(`a[${CMS_SLOT_CONTENT_ATTR}='card-link']`);
    expect(nestedRoot?.classList.contains(WEBFLOW_CONDITION_INVISIBLE_CLASS)).toBe(false);
    expect(nestedRoot?.style.display).not.toBe("none");
    expect(nestedTitle?.hasAttribute("hidden")).toBe(false);
    expect(clonedLink?.hasAttribute("hidden")).toBe(true);
    expect(clonedLink?.parentElement?.classList.contains(WEBFLOW_CONDITION_INVISIBLE_CLASS)).toBe(true);
    expect(clonedLink?.parentElement?.style.display).toBe("none");
  });

  it("conceals conditional nodes when Composer payload still contains the publish placeholder sentinel", () => {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const row = doc.createElement("div");
    const link = doc.createElement("a");
    link.setAttribute(CMS_SLOT_CONTENT_ATTR, "cta-link");
    link.setAttribute(CMS_SLOT_COND_ATTR, "1");
    link.setAttribute("href", "#codalyn-beacon-publish-placeholder");
    row.appendChild(link);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 3,
      i: [0],
      p: [{ "cta-link": "#codalyn-beacon-publish-placeholder" }],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedLink = target.querySelector<HTMLAnchorElement>(`a[${CMS_SLOT_CONTENT_ATTR}='cta-link']`);
    expect(clonedLink?.hasAttribute("hidden")).toBe(true);
    expect(clonedLink?.hasAttribute("href")).toBe(false);
  });

  it("sets img src from Composer URL on tagged img elements", () => {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const row = doc.createElement("div");
    const img = doc.createElement("img");
    img.setAttribute(CMS_SLOT_CONTENT_ATTR, "hero-image");
    img.setAttribute("src", CMS_SLOT_PUBLISH_PLACEHOLDER_URL);
    row.appendChild(img);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 3,
      i: [0],
      p: [{ "hero-image": "https://cdn.example.com/photo.jpg" }],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedImg = target.querySelector<HTMLImageElement>(`img[${CMS_SLOT_CONTENT_ATTR}='hero-image']`);
    expect(clonedImg?.getAttribute("src")).toBe("https://cdn.example.com/photo.jpg");
    expect(clonedImg?.hasAttribute("hidden")).toBe(false);
  });

  it("sets descendant img src when the beacon tag is on a wrapper", () => {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const row = doc.createElement("div");
    const wrap = doc.createElement("div");
    wrap.setAttribute(CMS_SLOT_CONTENT_ATTR, "hero-image");
    const img = doc.createElement("img");
    img.setAttribute("src", CMS_SLOT_PUBLISH_PLACEHOLDER_URL);
    wrap.appendChild(img);
    row.appendChild(wrap);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 3,
      i: [0],
      p: [{ "hero-image": "https://cdn.example.com/wrapped.jpg" }],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedWrap = target.querySelector<HTMLDivElement>(`[${CMS_SLOT_CONTENT_ATTR}='hero-image']`);
    const clonedImg = clonedWrap?.querySelector("img");
    expect(clonedImg?.getAttribute("src")).toBe("https://cdn.example.com/wrapped.jpg");
    expect(clonedWrap?.hasAttribute("hidden")).toBe(false);
  });

  it("applies the same Composer prop to direct and nested duplicate image bindings", () => {
    const url = "https://cdn.example.com/shared.avif";
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const row = doc.createElement("div");
    const direct = doc.createElement("img");
    direct.setAttribute(CMS_SLOT_CONTENT_ATTR, "hero-image");
    row.appendChild(direct);

    const nested = doc.createElement("div");
    nested.className = "nested-image";
    const nestedImg = doc.createElement("img");
    nestedImg.setAttribute(CMS_SLOT_CONTENT_ATTR, "hero-image@1");
    nested.appendChild(nestedImg);
    row.appendChild(nested);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 3,
      i: [0],
      p: [{ "hero-image": url }],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedRow = target.children[0];
    const imgs = clonedRow?.querySelectorAll<HTMLImageElement>("img");
    expect(imgs?.length).toBe(2);
    expect(imgs?.[0]?.getAttribute("src")).toBe(url);
    expect(imgs?.[1]?.getAttribute("src")).toBe(url);
  });

  it("reveals every list target when several slots render on one page (deferred reveal)", () => {
    const doc = document;

    function mountSlot(listKey: string): { target: HTMLDivElement } {
      const source = doc.createElement("div");
      source.setAttribute("data-target", "beacons");
      source.setAttribute("data-list", listKey);
      const row = doc.createElement("div");
      const title = doc.createElement("h2");
      title.setAttribute(CMS_SLOT_CONTENT_ATTR, "title");
      title.textContent = "default";
      row.appendChild(title);
      source.appendChild(row);

      const target = doc.createElement("div");
      target.setAttribute("data-beacon-target", "list");
      target.setAttribute("data-list", listKey);
      target.textContent = JSON.stringify({ v: 3, i: [0], p: [{ title: `value-${listKey}` }] });
      doc.body.append(source, target);
      return { target };
    }

    vi.useFakeTimers();
    try {
      const { target: targetA } = mountSlot("beacon-multi-a");
      const { target: targetB } = mountSlot("beacon-multi-b");

      runCmsSlotBeaconRuntime(doc);
      vi.runAllTimers();

      // Both slots clone their own row and apply their own Composer value.
      expect(targetA.children.length).toBe(1);
      expect(targetB.children.length).toBe(1);
      expect(targetA.querySelector(`[${CMS_SLOT_CONTENT_ATTR}='title']`)?.textContent).toBe("value-beacon-multi-a");
      expect(targetB.querySelector(`[${CMS_SLOT_CONTENT_ATTR}='title']`)?.textContent).toBe("value-beacon-multi-b");

      // The deferred reveal must run for every target, not just the last one in the loop.
      expect(targetA.style.visibility).not.toBe("hidden");
      expect(targetB.style.visibility).not.toBe("hidden");
    } finally {
      vi.useRealTimers();
    }
  });
});

/**
 * Fail-open guarantees for the published page. A list target is hidden the instant the runtime claims it; if the
 * runtime then throws, the customer's live site shows an empty hole to real visitors and the app looks broken.
 * Visible-but-unstyled must always beat invisible.
 */
describe("cms slot beacon runtime fail-open reveal (published site)", () => {
  const LIST = "beacon-failopen-test";

  function mountTarget(doc: Document, payload: unknown, listKey = LIST): HTMLDivElement {
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", listKey);
    const row = doc.createElement("div");
    const bound = doc.createElement("span");
    bound.setAttribute(CMS_SLOT_CONTENT_ATTR, "title");
    row.appendChild(bound);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", listKey);
    target.textContent = JSON.stringify(payload);
    doc.body.append(source, target);
    return target;
  }

  const okPayload = { v: 3, i: [0], p: [{ title: "hello" }] };

  /** Breaks `applyProps` (its first statement reads `target.children`) without breaking the clone step. */
  function breakApplyProps(target: HTMLElement): void {
    Object.defineProperty(target, "children", {
      configurable: true,
      get() {
        throw new Error("simulated runtime failure");
      },
    });
  }

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("emits the safety reveal, per-target isolation, and guarded apply into the runtime source", () => {
    const s = getCmsSlotPageInlineScriptSource();
    expect(s).toContain("function bSafeReveal(target)");
    expect(s).toContain(`},${CMS_SLOT_RUNTIME_SAFETY_REVEAL_MS})`);
    expect(s).toContain("bArmSafetyReveal(target)");
    expect(s).toContain("function bTryApplyProps(target,payload)");
    expect(s).toContain("bRevealAllTargets()");
  });

  it("arms an unconditional safety reveal for every claimed target", () => {
    vi.useFakeTimers();
    const target = mountTarget(document, okPayload);
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    runCmsSlotBeaconRuntime(document);

    const safetyCalls = setTimeoutSpy.mock.calls.filter(([, ms]) => ms === CMS_SLOT_RUNTIME_SAFETY_REVEAL_MS);
    expect(safetyCalls).toHaveLength(1);

    // The target is hidden right now; invoking *only* the safety callback must reveal it, proving the timer alone
    // is sufficient even if the normal reveal chain never completes.
    expect(target.style.visibility).toBe("hidden");
    const safetyCallback = safetyCalls[0][0] as () => void;
    safetyCallback();
    expect(target.style.visibility).toBe("");
  });

  it("reveals a target whose applyProps throws (never leaves content invisible)", () => {
    vi.useFakeTimers();
    const target = mountTarget(document, okPayload);
    breakApplyProps(target);

    expect(() => runCmsSlotBeaconRuntime(document)).not.toThrow();
    vi.advanceTimersByTime(CMS_SLOT_RUNTIME_SAFETY_REVEAL_MS + 10);

    expect(target.style.visibility).toBe("");
  });

  it("one failing target does not strand a healthy target elsewhere on the page", () => {
    vi.useFakeTimers();
    const broken = mountTarget(document, okPayload, "beacon-broken");
    const healthy = mountTarget(document, okPayload, "beacon-healthy");
    // Make the broken one fail during the clone step, before the normal reveal path runs.
    Object.defineProperty(broken, "appendChild", {
      configurable: true,
      value: () => {
        throw new Error("simulated clone failure");
      },
    });

    expect(() => runCmsSlotBeaconRuntime(document)).not.toThrow();
    vi.advanceTimersByTime(CMS_SLOT_RUNTIME_SAFETY_REVEAL_MS + 10);

    expect(broken.style.visibility).toBe("");
    expect(healthy.style.visibility).toBe("");
    expect(healthy.children.length).toBe(1);
  });

  it("still renders and reveals normally on the happy path", () => {
    vi.useFakeTimers();
    const target = mountTarget(document, okPayload);

    runCmsSlotBeaconRuntime(document);
    vi.advanceTimersByTime(200);

    expect(target.style.visibility).toBe("");
    expect(target.children.length).toBe(1);
    expect(target.textContent).toContain("hello");
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

describe("decideCmsSlotRuntimeSyncAction", () => {
  const HASH = "a1b2c3d4";
  const NO_REGISTERED = new Set<string>();
  const applied = (attrs?: Record<string, unknown>, over: Partial<PageScript> = {}): PageScript =>
    ({
      id: "reg-1",
      location: "footer",
      version: "1.0.0",
      attributes: attrs as Record<string, string> | undefined,
      ...over,
    }) as PageScript;
  const marked = (hash: unknown): Record<string, unknown> => ({
    "data-codalyn-beacon": "runtime",
    "data-codalyn-beacon-src-hash": hash,
  });
  const decide = (existing: unknown, force?: boolean) =>
    decideCmsSlotRuntimeSyncAction({
      existing: existing as never,
      expectedHash: HASH,
      registeredBeaconScriptIds: NO_REGISTERED,
      force,
    });

  it("skips when the applied footer runtime already carries the expected hash (canonical shape)", () => {
    expect(decide([applied(marked(HASH))]).action).toBe("skip");
  });

  it("skips regardless of attribute-name casing (Webflow varies it)", () => {
    const attrs = { "Data-Codalyn-Beacon": "runtime", "DATA-CODALYN-BEACON-SRC-HASH": HASH };
    expect(decide([applied(attrs)]).action).toBe("skip");
  });

  it("accepts the wrapped `{ value }` attribute shape for the hash (alternate runtime shape)", () => {
    expect(decide([applied(marked({ value: HASH }))]).action).toBe("skip");
  });

  it("registers when the applied hash is a different build", () => {
    expect(decide([applied(marked("ffffffff"))].concat()).action).toBe("register");
  });

  it("registers when no beacon runtime is applied at all (missing field)", () => {
    expect(decide([]).action).toBe("register");
    expect(decide([applied(undefined, { id: "someone-elses" })]).action).toBe("register");
  });

  it("registers on a missing or garbled hash attribute — never silently skips", () => {
    for (const hash of [undefined, null, "", "   ", 42, {}, { value: "" }, [], true]) {
      expect(decide([applied(marked(hash))]).action).toBe("register");
    }
  });

  it("registers when the marker attribute is absent", () => {
    expect(decide([applied({ "data-codalyn-beacon-src-hash": HASH })]).action).toBe("register");
  });

  it("registers when the applied runtime is not in the footer", () => {
    expect(decide([applied(marked(HASH), { location: "header" })]).action).toBe("register");
    expect(decide([applied(marked(HASH), { location: undefined })]).action).toBe("register");
  });

  it("registers when more than one beacon runtime is applied (restores the exactly-one invariant)", () => {
    const dupes = [applied(marked(HASH)), applied(marked(HASH), { id: "reg-2" })];
    expect(decide(dupes).action).toBe("register");
  });

  it("counts registry-known scripts as ours even without the marker attribute", () => {
    const stale = { id: "reg-legacy", location: "footer", version: "0.9.0" } as PageScript;
    const decision = decideCmsSlotRuntimeSyncAction({
      existing: [applied(marked(HASH)), stale],
      expectedHash: HASH,
      registeredBeaconScriptIds: new Set(["reg-legacy"]),
      force: false,
    });
    expect(decision.action).toBe("register");
  });

  it("registers on malformed `existing` input rather than assuming a clean page", () => {
    for (const existing of [null, undefined, "not-an-array", 7, {}]) {
      expect(decide(existing).action).toBe("register");
    }
    expect(decide([null, undefined]).action).toBe("register");
  });

  it("registers when the expected hash itself is missing or malformed", () => {
    for (const expectedHash of ["", "   ", null, undefined, 5]) {
      const decision = decideCmsSlotRuntimeSyncAction({
        existing: [applied(marked(HASH))],
        expectedHash: expectedHash as never,
        registeredBeaconScriptIds: NO_REGISTERED,
      });
      expect(decision.action).toBe("register");
    }
  });

  it("force always registers, even on an exact match", () => {
    expect(decide([applied(marked(HASH))], true).action).toBe("register");
  });

  it("always explains itself (the reason is surfaced in warnings)", () => {
    expect(decide([applied(marked(HASH))]).reason.length).toBeGreaterThan(0);
    expect(decide([]).reason.length).toBeGreaterThan(0);
  });
});

describe("planBoundedPageScan", () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `page-${i}`);

  it("scans every page when the site fits under the cap", () => {
    const plan = planBoundedPageScan(ids(10));
    expect(plan.scan).toHaveLength(10);
    expect(plan.skipped).toBe(0);
    expect(plan.complete).toBe(true);
  });

  it("caps a large site and reports the remainder as skipped", () => {
    const total = PURGE_MAX_PAGES_SCANNED + 25;
    const plan = planBoundedPageScan(ids(total));
    expect(plan.scan).toHaveLength(PURGE_MAX_PAGES_SCANNED);
    expect(plan.skipped).toBe(25);
    // Incomplete → the caller must skip the orphan purge rather than act on a partial id set.
    expect(plan.complete).toBe(false);
  });

  it("is complete at exactly the cap", () => {
    const plan = planBoundedPageScan(ids(PURGE_MAX_PAGES_SCANNED));
    expect(plan.skipped).toBe(0);
    expect(plan.complete).toBe(true);
  });

  it("drops non-string and empty ids at the boundary", () => {
    const plan = planBoundedPageScan(["a", "", null, undefined, 5, {}, "b"]);
    expect(plan.scan).toEqual(["a", "b"]);
    expect(plan.complete).toBe(true);
  });

  it("treats malformed input as an empty, complete scan", () => {
    for (const input of [null, undefined, "nope", 3, {}]) {
      const plan = planBoundedPageScan(input as never);
      expect(plan.scan).toEqual([]);
      expect(plan.complete).toBe(true);
    }
  });

  it("treats a non-positive or malformed cap as scan-nothing rather than scan-everything", () => {
    for (const cap of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const plan = planBoundedPageScan(ids(5), cap);
      expect(plan.scan).toEqual([]);
      expect(plan.skipped).toBe(5);
      expect(plan.complete).toBe(false);
    }
  });
});

describe("describeTowerFailure (Tower/Webflow error → actionable message)", () => {
  it("prefers message, then error, then hint, then a generic status line", () => {
    expect(describeTowerFailure(500, { message: "boom" }, "Register")).toBe("boom");
    expect(describeTowerFailure(500, { error: "bad" }, "Register")).toBe("bad");
    expect(describeTowerFailure(500, { hint: "try later" }, "Register")).toBe("try later");
    expect(describeTowerFailure(500, null, "Register")).toBe("Register failed (500)");
  });

  it("tells the user to reconnect when the proxy reports the Webflow token was revoked (401)", () => {
    const msg = describeTowerFailure(
      401,
      { error: "webflow_token_revoked", code: "WEBFLOW_TOKEN_REVOKED" },
      "Register"
    );
    expect(msg).toMatch(/Reconnect Webflow in Tower/);
    expect(msg).toContain("webflow_token_revoked");
  });

  it("explains a 403 as a permission problem with a reconnect CTA, not a retry", () => {
    expect(describeTowerFailure(403, { message: "Forbidden" }, "Register")).toMatch(/Reconnect Webflow in Tower/);
  });

  it("keeps the missing-scope guidance for scope errors regardless of status", () => {
    expect(describeTowerFailure(400, { message: "missing_scopes: assets:write" }, "Register")).toMatch(
      /assets:write and custom_code:write/
    );
  });

  it("returns the plain message for other statuses", () => {
    expect(describeTowerFailure(404, { message: "Custom code block not found" }, "Get")).toBe(
      "Custom code block not found"
    );
  });
});

describe("cmsSlotRuntimeScriptVersion (content-derived registered-script version)", () => {
  it("derives the version from the app semver plus the runtime source hash", () => {
    expect(cmsSlotRuntimeScriptVersion({ base: "0.1.0", sourceHash: "1a2b3c4d", takenVersions: new Set() })).toBe(
      "0.1.0+beacon.1a2b3c4d"
    );
  });

  it("is deterministic for the same content and only suffixes when that exact version is already registered", () => {
    const a = cmsSlotRuntimeScriptVersion({ base: "0.1.0", sourceHash: "1a2b3c4d", takenVersions: new Set() });
    const b = cmsSlotRuntimeScriptVersion({ base: "0.1.0", sourceHash: "1a2b3c4d", takenVersions: new Set() });
    expect(a).toBe(b);
    expect(
      cmsSlotRuntimeScriptVersion({
        base: "0.1.0",
        sourceHash: "1a2b3c4d",
        takenVersions: new Set(["0.1.0+beacon.1a2b3c4d"]),
      })
    ).toBe("0.1.0+beacon.1a2b3c4d.2");
    expect(
      cmsSlotRuntimeScriptVersion({
        base: "0.1.0",
        sourceHash: "1a2b3c4d",
        takenVersions: new Set(["0.1.0+beacon.1a2b3c4d", "0.1.0+beacon.1a2b3c4d.2"]),
      })
    ).toBe("0.1.0+beacon.1a2b3c4d.3");
  });

  it("changes when the runtime source changes", () => {
    const taken = new Set<string>();
    expect(cmsSlotRuntimeScriptVersion({ base: "0.1.0", sourceHash: "aaaaaaaa", takenVersions: taken })).not.toBe(
      cmsSlotRuntimeScriptVersion({ base: "0.1.0", sourceHash: "bbbbbbbb", takenVersions: taken })
    );
  });

  it("stays a valid semver build string (dot-separated alphanumerics after +)", () => {
    const v = cmsSlotRuntimeScriptVersion({ base: "1.2.3", sourceHash: "0f0f0f0f", takenVersions: new Set() });
    expect(v).toMatch(/^\d+\.\d+\.\d+\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*$/);
  });
});
