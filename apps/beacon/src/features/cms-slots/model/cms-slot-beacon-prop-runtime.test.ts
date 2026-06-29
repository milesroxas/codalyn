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
});
