import { describe, expect, it } from "vitest";
import { beaconPropDebugRuntimeSource } from "@/features/cms-slots/model/cms-slot-beacon-debug";
import {
  beaconPropApplyValueRuntimeSource,
  beaconPropEmptyRuntimeSource,
  beaconPropVisibilityRuntimeSource,
  CMS_SLOT_PUBLISH_PLACEHOLDER_EMAIL,
  CMS_SLOT_PUBLISH_PLACEHOLDER_TEXT,
  CMS_SLOT_PUBLISH_PLACEHOLDER_URL,
  isBeaconPropValueEmpty,
  isBeaconPublishPlaceholderValue,
  isBeaconRuntimePropValueEmpty,
  WEBFLOW_CONDITION_INVISIBLE_CLASS,
} from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import { getCmsSlotPageInlineScriptSource } from "@/features/cms-slots/model/cms-slot-page-inline-script";

describe("isBeaconPublishPlaceholderValue", () => {
  it("recognizes publish seed sentinels", () => {
    expect(isBeaconPublishPlaceholderValue(CMS_SLOT_PUBLISH_PLACEHOLDER_URL)).toBe(true);
    expect(isBeaconPublishPlaceholderValue(CMS_SLOT_PUBLISH_PLACEHOLDER_EMAIL)).toBe(true);
    expect(isBeaconPublishPlaceholderValue(CMS_SLOT_PUBLISH_PLACEHOLDER_TEXT)).toBe(true);
    expect(isBeaconPublishPlaceholderValue("https://cdn.example.com/codalyn-beacon-publish-placeholder.png")).toBe(
      true
    );
    expect(isBeaconPublishPlaceholderValue("https://example.com")).toBe(false);
  });
});

describe("isBeaconPropValueEmpty", () => {
  it("treats null, undefined, and whitespace-only strings as empty", () => {
    expect(isBeaconPropValueEmpty(null)).toBe(true);
    expect(isBeaconPropValueEmpty(undefined)).toBe(true);
    expect(isBeaconPropValueEmpty("")).toBe(true);
    expect(isBeaconPropValueEmpty("  ")).toBe(true);
  });

  it("treats publish placeholder sentinels as empty at runtime", () => {
    expect(isBeaconRuntimePropValueEmpty(CMS_SLOT_PUBLISH_PLACEHOLDER_URL)).toBe(true);
    expect(isBeaconRuntimePropValueEmpty(CMS_SLOT_PUBLISH_PLACEHOLDER_EMAIL)).toBe(true);
    expect(isBeaconRuntimePropValueEmpty(CMS_SLOT_PUBLISH_PLACEHOLDER_TEXT)).toBe(true);
  });

  it("does not treat publish placeholders as empty for Designer field checks", () => {
    expect(isBeaconPropValueEmpty(CMS_SLOT_PUBLISH_PLACEHOLDER_URL)).toBe(false);
  });

  it("treats real Composer values as set", () => {
    expect(isBeaconPropValueEmpty("https://example.com")).toBe(false);
    expect(isBeaconPropValueEmpty("0")).toBe(false);
  });
});

describe("beacon prop runtime source snippets", () => {
  it("visibility helper source parses", () => {
    expect(() => {
      void new Function(beaconPropVisibilityRuntimeSource());
    }).not.toThrow();
  });

  it("empty helper source parses", () => {
    expect(() => {
      void new Function(beaconPropEmptyRuntimeSource());
    }).not.toThrow();
  });

  it("applyValue helper source parses", () => {
    expect(() => {
      void new Function(beaconPropApplyValueRuntimeSource());
    }).not.toThrow();
  });

  it("debug overlay helper source parses", () => {
    expect(() => {
      void new Function(beaconPropDebugRuntimeSource());
    }).not.toThrow();
  });

  it("embeds shared empty + visibility helpers in the footer script", () => {
    const s = getCmsSlotPageInlineScriptSource();
    expect(s).toContain(beaconPropEmptyRuntimeSource());
    expect(s).toContain(beaconPropVisibilityRuntimeSource());
    expect(s).toContain(beaconPropApplyValueRuntimeSource());
    expect(s).toContain(beaconPropDebugRuntimeSource());
    expect(s).toContain("bDbgBindKeys()");
    expect(s).toContain("bPropReveal(node,row)");
    expect(s).toContain("bPropConceal(node,row)");
    expect(s).toContain("bPropClearPublishPlaceholder(node)");
    expect(s).toContain(WEBFLOW_CONDITION_INVISIBLE_CLASS);
  });
});

/** @vitest-environment jsdom */
describe("beacon prop applyValue runtime", () => {
  it("sets nested img src and picture source srcset for AVIF URLs", () => {
    const applyValue = new Function(`${beaconPropApplyValueRuntimeSource()}; return applyValue;`)() as (
      el: Element,
      v: string
    ) => void;
    const avif =
      "https://cdn.prod.website-files.com/6a19b630fc79ff670f827e0e/6a19bd9570056bbef3abe15a_cms-test-01.avif";

    const picture = document.createElement("picture");
    const source = document.createElement("source");
    source.setAttribute("srcset", "https://codalyn.beacon/publish-placeholder");
    const img = document.createElement("img");
    picture.append(source, img);

    applyValue(picture, avif);
    expect(source.getAttribute("srcset")).toBe(avif);
    expect(source.getAttribute("type")).toBe("image/avif");
    expect(img.getAttribute("src")).toBe(avif);

    const link = document.createElement("a");
    const linkImg = document.createElement("img");
    link.appendChild(linkImg);
    applyValue(link, avif);
    expect(link.getAttribute("href")).toBeNull();
    expect(linkImg.getAttribute("src")).toBe(avif);

    const taggedImg = document.createElement("img");
    const picWrap = document.createElement("picture");
    const picSource = document.createElement("source");
    picSource.setAttribute("srcset", "https://codalyn.beacon/publish-placeholder");
    picWrap.append(picSource, taggedImg);
    applyValue(taggedImg, avif);
    expect(taggedImg.getAttribute("src")).toBe(avif);
    expect(picSource.getAttribute("srcset")).toBe(avif);
  });

  it("applies link envelopes to anchors: href, new-tab target/rel, relative paths, and legacy bare urls", () => {
    const applyValue = new Function(`${beaconPropApplyValueRuntimeSource()}; return applyValue;`)() as (
      el: Element,
      v: string
    ) => void;

    // New-tab external link → href + target + rel.
    const a1 = document.createElement("a");
    applyValue(a1, JSON.stringify({ k: "url", h: "https://x.com", t: 1 }));
    expect(a1.getAttribute("href")).toBe("https://x.com");
    expect(a1.getAttribute("target")).toBe("_blank");
    expect(a1.getAttribute("rel")).toBe("noopener noreferrer");

    // Internal relative path, current tab → strips any pre-existing target.
    const a2 = document.createElement("a");
    a2.setAttribute("target", "_blank");
    applyValue(a2, JSON.stringify({ k: "cms", h: "/blog/post", c: "col", e: "item" }));
    expect(a2.getAttribute("href")).toBe("/blog/post");
    expect(a2.getAttribute("target")).toBeNull();

    // Legacy bare url string keeps the historical current-tab behavior.
    const a3 = document.createElement("a");
    applyValue(a3, "https://legacy.example");
    expect(a3.getAttribute("href")).toBe("https://legacy.example");
    expect(a3.getAttribute("target")).toBeNull();

    // Malformed envelope degrades to using the raw string as href (no throw).
    const a4 = document.createElement("a");
    applyValue(a4, "{not json");
    expect(a4.getAttribute("href")).toBe("{not json");
  });

  it("rich text: data-cb-html marked node applies HTML via innerHTML (markup preserved)", () => {
    const applyValue = new Function(`${beaconPropApplyValueRuntimeSource()}; return applyValue;`)() as (
      el: Element,
      v: string
    ) => void;

    const marked = document.createElement("div");
    marked.setAttribute("data-cb-html", "1");
    applyValue(marked, "<p><strong>Hi</strong> there</p>");
    expect(marked.querySelector("strong")?.textContent).toBe("Hi");
    expect(marked.querySelector("p")).not.toBeNull();
  });

  it("rich text: .w-richtext is a structural fallback for innerHTML", () => {
    const applyValue = new Function(`${beaconPropApplyValueRuntimeSource()}; return applyValue;`)() as (
      el: Element,
      v: string
    ) => void;

    const wrap = document.createElement("div");
    wrap.className = "w-richtext";
    applyValue(wrap, "<ul><li>a</li></ul>");
    expect(wrap.querySelector("li")?.textContent).toBe("a");
  });

  it("rich text: unmarked node still uses textContent (existing behavior unregressed)", () => {
    const applyValue = new Function(`${beaconPropApplyValueRuntimeSource()}; return applyValue;`)() as (
      el: Element,
      v: string
    ) => void;

    const plain = document.createElement("div");
    applyValue(plain, "<p>hi</p>");
    expect(plain.querySelector("p")).toBeNull();
    expect(plain.textContent).toBe("<p>hi</p>");
  });

  it("rich text: bSafeHtml guard strips <script>, on* handlers and javascript: hrefs", () => {
    const applyValue = new Function(`${beaconPropApplyValueRuntimeSource()}; return applyValue;`)() as (
      el: Element,
      v: string
    ) => void;

    const marked = document.createElement("div");
    marked.setAttribute("data-cb-html", "1");
    applyValue(
      marked,
      '<p>ok</p><script>alert(1)</script><img onerror="evil()" src="x"><a href="javascript:evil()">x</a>'
    );
    expect(marked.textContent).toContain("ok");
    expect(marked.querySelector("script")).toBeNull();
    expect(marked.innerHTML.toLowerCase()).not.toContain("onerror");
    expect(marked.innerHTML.toLowerCase()).not.toContain("javascript:");
  });

  it("rich text: allowlisted markup survives; safe anchors keep href with hardened target/rel", () => {
    const applyValue = new Function(`${beaconPropApplyValueRuntimeSource()}; return applyValue;`)() as (
      el: Element,
      v: string
    ) => void;

    const marked = document.createElement("div");
    marked.setAttribute("data-cb-html", "1");
    applyValue(
      marked,
      '<h2>T</h2><ul><li><strong>a</strong></li></ul><a href="https://x.com" target="_blank" class="fancy" data-x="1">go</a>'
    );
    expect(marked.querySelector("h2")?.textContent).toBe("T");
    expect(marked.querySelector("ul li strong")?.textContent).toBe("a");
    const a = marked.querySelector("a");
    expect(a?.getAttribute("href")).toBe("https://x.com");
    expect(a?.getAttribute("target")).toBe("_blank");
    expect(a?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(a?.getAttribute("class")).toBeNull();
    expect(a?.getAttribute("data-x")).toBeNull();
  });

  it("rich text: disallowed wrappers unwrap (text kept), on* attrs on allowed tags dropped", () => {
    const applyValue = new Function(`${beaconPropApplyValueRuntimeSource()}; return applyValue;`)() as (
      el: Element,
      v: string
    ) => void;

    const marked = document.createElement("div");
    marked.setAttribute("data-cb-html", "1");
    applyValue(marked, '<div style="color:red"><p onclick="evil()">keep</p></div><a href="data:text/html,x">txt</a>');
    expect(marked.querySelector("div")).toBeNull();
    const p = marked.querySelector("p");
    expect(p?.textContent).toBe("keep");
    expect(p?.getAttribute("onclick")).toBeNull();
    // data: href → anchor unwrapped, its text preserved.
    expect(marked.querySelector("a")).toBeNull();
    expect(marked.textContent).toContain("txt");
  });

  it("link + iframe apply paths reject javascript: URLs", () => {
    const applyValue = new Function(`${beaconPropApplyValueRuntimeSource()}; return applyValue;`)() as (
      el: Element,
      v: string
    ) => void;

    const a = document.createElement("a");
    applyValue(a, JSON.stringify({ k: "url", h: "javascript:evil()", t: 1 }));
    expect(a.getAttribute("href")).toBe("#");

    const iframe = document.createElement("iframe");
    applyValue(iframe, "javascript:evil()");
    expect(iframe.getAttribute("src")).toBeNull();

    const iframeOk = document.createElement("iframe");
    applyValue(iframeOk, "https://player.example/v/1");
    expect(iframeOk.getAttribute("src")).toBe("https://player.example/v/1");
  });
});
