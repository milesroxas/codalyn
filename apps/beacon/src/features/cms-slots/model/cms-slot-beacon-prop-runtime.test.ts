import { describe, expect, it } from "vitest";
import { beaconPropDebugRuntimeSource } from "@/features/cms-slots/model/cms-slot-beacon-debug";
import {
  beaconPropApplyClassRuntimeSource,
  beaconPropApplyValueRuntimeSource,
  beaconPropEmptyRuntimeSource,
  beaconPropPickRuntimeSource,
  beaconPropVisibilityRuntimeSource,
  CMS_SLOT_CLASS_APPLIED_ATTR,
  CMS_SLOT_CLASS_ATTR,
  CMS_SLOT_PUBLISH_PLACEHOLDER_EMAIL,
  CMS_SLOT_PUBLISH_PLACEHOLDER_TEXT,
  CMS_SLOT_PUBLISH_PLACEHOLDER_URL,
  isBeaconPropValueEmpty,
  isBeaconPublishPlaceholderValue,
  isBeaconRuntimePropValueEmpty,
  WEBFLOW_CONDITION_INVISIBLE_CLASS,
} from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import { getCmsSlotPageInlineScriptSource } from "@/features/cms-slots/model/cms-slot-page-inline-script";

/** Builds the runtime `bApplyClassBinding(node, props)` with its `pickP` + `bPropEmpty` dependencies. */
function buildApplyClassBinding(): (node: Element, props: Record<string, string>) => void {
  const src = `${beaconPropPickRuntimeSource()}${beaconPropEmptyRuntimeSource()}${beaconPropApplyClassRuntimeSource()}; return bApplyClassBinding;`;
  return new Function(src)() as (node: Element, props: Record<string, string>) => void;
}

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

  it("class-append helper source parses (with its pickP + bPropEmpty deps)", () => {
    expect(() => {
      void new Function(
        `${beaconPropPickRuntimeSource()}${beaconPropEmptyRuntimeSource()}${beaconPropApplyClassRuntimeSource()}`
      );
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
    expect(s).toContain(beaconPropApplyClassRuntimeSource());
    expect(s).toContain(beaconPropDebugRuntimeSource());
    expect(s).toContain("bDbgBindKeys()");
    expect(s).toContain("bPropReveal(node,row)");
    expect(s).toContain("bPropConceal(node,row)");
    expect(s).toContain("bPropClearPublishPlaceholder(node)");
    expect(s).toContain(WEBFLOW_CONDITION_INVISIBLE_CLASS);
  });

  it("queries class-bound elements and invokes the class-append helper in the footer script", () => {
    const s = getCmsSlotPageInlineScriptSource();
    expect(s).toContain(`querySelectorAll("[${CMS_SLOT_CLASS_ATTR}]")`);
    expect(s).toContain("bApplyClassBinding(");
  });
});

/** @vitest-environment jsdom */
describe("beacon prop class-append runtime", () => {
  function classEl(classAttr: string, baseClass = ""): HTMLDivElement {
    const el = document.createElement("div");
    if (baseClass) {
      el.className = baseClass;
    }
    el.setAttribute(CMS_SLOT_CLASS_ATTR, classAttr);
    return el;
  }

  it("appends whitespace-separated tokens to the element class list, keeping existing classes", () => {
    const apply = buildApplyClassBinding();
    const el = classEl("theme", "base wf-block");

    apply(el, { theme: "is-dark accent-blue" });

    expect(el.classList.contains("base")).toBe(true);
    expect(el.classList.contains("wf-block")).toBe(true);
    expect(el.classList.contains("is-dark")).toBe(true);
    expect(el.classList.contains("accent-blue")).toBe(true);
    expect(el.getAttribute(CMS_SLOT_CLASS_APPLIED_ATTR)).toBe("is-dark accent-blue");
  });

  it("is idempotent across the three reapply passes (no duplicate tokens)", () => {
    const apply = buildApplyClassBinding();
    const el = classEl("theme", "base");

    apply(el, { theme: "is-dark" });
    apply(el, { theme: "is-dark" });
    apply(el, { theme: "is-dark" });

    expect(el.className.split(/\s+/).filter((c) => c === "is-dark")).toHaveLength(1);
  });

  it("replaces a prior pass's tokens when the resolved value changes (re-render)", () => {
    const apply = buildApplyClassBinding();
    const el = classEl("theme", "base");

    apply(el, { theme: "is-dark" });
    apply(el, { theme: "is-light" });

    expect(el.classList.contains("is-light")).toBe(true);
    expect(el.classList.contains("is-dark")).toBe(false);
    expect(el.classList.contains("base")).toBe(true);
  });

  it("skips empty values and publish-placeholder seed tokens (nbsp), removing the applied marker", () => {
    const apply = buildApplyClassBinding();

    const emptyEl = classEl("theme", "base");
    apply(emptyEl, { theme: "" });
    expect(emptyEl.className).toBe("base");
    expect(emptyEl.hasAttribute(CMS_SLOT_CLASS_APPLIED_ATTR)).toBe(false);

    const seedEl = classEl("theme", "base");
    apply(seedEl, { theme: CMS_SLOT_PUBLISH_PLACEHOLDER_TEXT });
    expect(seedEl.className).toBe("base");
  });

  it("resolves duplicate-binding `@N` segments back to the base prop id", () => {
    const apply = buildApplyClassBinding();
    const el = classEl("row-class@1", "base");

    apply(el, { "row-class": "highlight" });

    expect(el.classList.contains("highlight")).toBe(true);
  });

  it("appends tokens from multiple class-bound props on one element", () => {
    const apply = buildApplyClassBinding();
    const el = classEl("a|b", "base");

    apply(el, { a: "from-a", b: "from-b extra" });

    expect(el.classList.contains("from-a")).toBe(true);
    expect(el.classList.contains("from-b")).toBe(true);
    expect(el.classList.contains("extra")).toBe(true);
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
});
