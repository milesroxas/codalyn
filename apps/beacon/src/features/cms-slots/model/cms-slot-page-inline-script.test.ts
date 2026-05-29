import { describe, expect, it } from "vitest";
import {
  CMS_SLOT_COND_ATTR,
  CMS_SLOT_CONTENT_ATTR,
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

  it("reads the v3 content and conditional attributes", () => {
    const s = getCmsSlotPageInlineScriptSource();
    expect(s).toContain(`querySelectorAll("[${CMS_SLOT_CONTENT_ATTR}]")`);
    expect(s).toContain(`getAttribute("${CMS_SLOT_CONTENT_ATTR}")`);
    expect(s).toContain(`getAttribute("${CMS_SLOT_COND_ATTR}")`);
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

  it("falls back to cloning Engine rows when list target text is empty or invalid", () => {
    for (const payloadJson of ["", "not-json", '{"v":2,"i":[0]}']) {
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
    row.setAttribute("href", "https://codalyn.beacon/publish-placeholder");
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
    link.setAttribute("href", "https://codalyn.beacon/publish-placeholder");
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
    link.setAttribute("href", "https://codalyn.beacon/publish-placeholder");
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
    link.setAttribute("href", "https://codalyn.beacon/publish-placeholder");
    row.appendChild(link);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = JSON.stringify({
      v: 3,
      i: [0],
      p: [{ "cta-link": "https://codalyn.beacon/publish-placeholder" }],
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
});
