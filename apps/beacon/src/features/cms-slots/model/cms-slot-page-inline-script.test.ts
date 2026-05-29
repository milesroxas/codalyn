import { describe, expect, it } from "vitest";
import {
  CMS_SLOT_PUBLISH_PLACEHOLDER_URL,
  WEBFLOW_CONDITION_INVISIBLE_CLASS,
} from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import { CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_INLINE_KEYS } from "@/features/cms-slots/model/cms-slot-list-target-designer-placeholder";
import { CMS_SLOT_LIST_RENDER_LAYOUT_STYLE_NAME } from "@/features/cms-slots/model/cms-slot-list-target-slot-style";
import {
  getCmsSlotPageInlineScriptSource,
  isBeaconRuntimeAssetFileName,
  normalizeHostedAssetUrl,
  selectBeaconRuntimeAssetIdsToPurge,
} from "@/features/cms-slots/model/cms-slot-page-inline-script";

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
    title.setAttribute("data-codalyn-beacon-prop", "parent-title");
    title.textContent = "Designer placeholder";
    const inner = doc.createElement("div");
    const imgSlot = doc.createElement("span");
    imgSlot.setAttribute("data-codalyn-beacon-prop", "parent-img");
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
    const { target } = mountListFixture(JSON.stringify({ v: 2, i: [], p: [] }));
    runCmsSlotBeaconRuntime(document);
    expect(target.children.length).toBe(0);
  });

  it("falls back to cloning Engine rows when list target text is empty or invalid", () => {
    for (const payloadJson of ["", "not-json", '{"v":3,"i":[0]}']) {
      const doc = document;
      const source = doc.createElement("div");
      source.setAttribute("data-target", "beacons");
      source.setAttribute("data-list", LIST);
      const row = doc.createElement("div");
      row.textContent = "Engine row";
      source.appendChild(row);

      const target = doc.createElement("div");
      target.setAttribute("data-beacon-target", "list");
      target.setAttribute("data-list", LIST);
      target.textContent = payloadJson;
      doc.body.append(source, target);

      runCmsSlotBeaconRuntime(doc);
      expect(target.children.length).toBe(1);
      doc.body.innerHTML = "";
    }
  });

  it("deep-clones nested component markup and applies per-row props inside nested nodes", () => {
    const payload = JSON.stringify({
      v: 2,
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

    const title = clonedRow?.querySelector<HTMLHeadingElement>("[data-codalyn-beacon-prop='parent-title']");
    expect(title?.textContent).toBe("Row A title");
    expect(title?.hasAttribute("hidden")).toBe(false);

    const imgSlot = clonedRow?.querySelector("[data-codalyn-beacon-prop='parent-img']");
    expect(imgSlot?.hasAttribute("hidden")).toBe(true);
  });

  it("clones the same nested template twice with independent prop payloads", () => {
    const payload = JSON.stringify({
      v: 2,
      i: [0, 0],
      p: [{ "parent-title": "First" }, { "parent-title": "Second" }],
    });
    const { target } = mountListFixture(payload);
    runCmsSlotBeaconRuntime(document);

    expect(target.children.length).toBe(2);
    const titles = [...target.querySelectorAll<HTMLHeadingElement>("[data-codalyn-beacon-prop='parent-title']")];
    expect(titles.map((el) => el.textContent)).toEqual(["First", "Second"]);
    expect(titles[0]).not.toBe(titles[1]);
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
    link.setAttribute("data-codalyn-beacon-prop", "cta-link");
    link.setAttribute("href", "https://codalyn.beacon/publish-placeholder");
    wrap.appendChild(link);
    row.appendChild(wrap);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 2,
      i: [0],
      p: [{ "cta-link": "https://example.com/go" }],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedLink = target.querySelector<HTMLAnchorElement>("a[data-codalyn-beacon-prop='cta-link']");
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
    link.setAttribute("data-codalyn-beacon-prop", "card-link");
    link.setAttribute("href", "https://codalyn.beacon/publish-placeholder");
    wrap.appendChild(link);
    nested.appendChild(wrap);
    row.appendChild(nested);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 2,
      i: [0],
      p: [{ "card-link": "https://example.com/nested" }],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedLink = target.querySelector<HTMLAnchorElement>(
      ".nested-component a[data-codalyn-beacon-prop='card-link']"
    );
    expect(clonedLink?.getAttribute("href")).toBe("https://example.com/nested");
    expect(clonedLink?.parentElement?.classList.contains(WEBFLOW_CONDITION_INVISIBLE_CLASS)).toBe(false);
  });

  it("conceals publish placeholders when Composer leaves the prop empty", () => {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const row = doc.createElement("div");
    const title = doc.createElement("h2");
    title.textContent = "Card title";
    const wrap = doc.createElement("div");
    const link = doc.createElement("a");
    link.setAttribute("data-codalyn-beacon-prop", "cta-link");
    link.setAttribute("href", "https://codalyn.beacon/publish-placeholder");
    link.textContent = "Click me";
    wrap.appendChild(link);
    row.appendChild(title);
    row.appendChild(wrap);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 2,
      i: [0],
      p: [{ "cta-link": "" }],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedTitle = target.querySelector<HTMLHeadingElement>("h2");
    const clonedLink = target.querySelector<HTMLAnchorElement>("a[data-codalyn-beacon-prop='cta-link']");
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
    link.setAttribute("data-codalyn-beacon-prop", "card-link");
    link.setAttribute("href", "https://codalyn.beacon/publish-placeholder");
    wrap.appendChild(link);
    nested.appendChild(title);
    nested.appendChild(wrap);
    row.appendChild(nested);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 2,
      i: [0],
      p: [{ "card-link": "" }],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const nestedRoot = target.querySelector<HTMLDivElement>(".nested-component");
    const nestedTitle = nestedRoot?.querySelector<HTMLHeadingElement>("h3");
    const clonedLink = target.querySelector<HTMLAnchorElement>("a[data-codalyn-beacon-prop='card-link']");
    expect(nestedRoot?.classList.contains(WEBFLOW_CONDITION_INVISIBLE_CLASS)).toBe(false);
    expect(nestedRoot?.style.display).not.toBe("none");
    expect(nestedTitle?.hasAttribute("hidden")).toBe(false);
    expect(clonedLink?.hasAttribute("hidden")).toBe(true);
    expect(clonedLink?.parentElement?.classList.contains(WEBFLOW_CONDITION_INVISIBLE_CLASS)).toBe(true);
    expect(clonedLink?.parentElement?.style.display).toBe("none");
  });

  it("conceals nodes when Composer payload still contains the publish placeholder sentinel", () => {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const row = doc.createElement("div");
    const link = doc.createElement("a");
    link.setAttribute("data-codalyn-beacon-prop", "cta-link");
    link.setAttribute("href", "https://codalyn.beacon/publish-placeholder");
    row.appendChild(link);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 2,
      i: [0],
      p: [{ "cta-link": "https://codalyn.beacon/publish-placeholder" }],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedLink = target.querySelector<HTMLAnchorElement>("a[data-codalyn-beacon-prop='cta-link']");
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
    img.setAttribute("data-codalyn-beacon-prop", "hero-image");
    img.setAttribute("src", CMS_SLOT_PUBLISH_PLACEHOLDER_URL);
    row.appendChild(img);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 2,
      i: [0],
      p: [{ "hero-image": "https://cdn.example.com/photo.jpg" }],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedImg = target.querySelector<HTMLImageElement>("img[data-codalyn-beacon-prop='hero-image']");
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
    wrap.setAttribute("data-codalyn-beacon-prop", "hero-image");
    const img = doc.createElement("img");
    img.setAttribute("src", CMS_SLOT_PUBLISH_PLACEHOLDER_URL);
    wrap.appendChild(img);
    row.appendChild(wrap);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 2,
      i: [0],
      p: [{ "hero-image": "https://cdn.example.com/wrapped.jpg" }],
    });
    doc.body.append(source, target);

    runCmsSlotBeaconRuntime(doc);

    const clonedWrap = target.querySelector<HTMLDivElement>("[data-codalyn-beacon-prop='hero-image']");
    const clonedImg = clonedWrap?.querySelector("img");
    expect(clonedImg?.getAttribute("src")).toBe("https://cdn.example.com/wrapped.jpg");
    expect(clonedWrap?.hasAttribute("hidden")).toBe(false);
  });
});
