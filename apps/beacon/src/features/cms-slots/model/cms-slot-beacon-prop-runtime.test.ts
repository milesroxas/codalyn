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
    expect(s).toContain("bPropReveal(node,row)");
    expect(s).toContain("bPropConceal(node,row)");
    expect(s).toContain("bPropClearPublishPlaceholder(node)");
    expect(s).toContain(WEBFLOW_CONDITION_INVISIBLE_CLASS);
  });

  it("stubs the debug HUD and its keyboard shortcut on every non-development channel", () => {
    // Vitest runs with a non-development __BUILD_CHANNEL__, matching preview/production behavior:
    // no debug UI, no document-level hotkey, no runtime <style> creation may reach customer sites
    // (Marketplace guidelines: no app keyboard shortcuts; reviewed runtime = shipped runtime).
    const s = getCmsSlotPageInlineScriptSource();
    expect(s).not.toContain(beaconPropDebugRuntimeSource());
    expect(s).toContain("function bDbgBindKeys(){}");
    expect(s).not.toContain("codalyn-beacon-debug");
    expect(s).not.toContain('createElement("style")');
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
    source.setAttribute("srcset", "#codalyn-beacon-publish-placeholder");
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
    picSource.setAttribute("srcset", "#codalyn-beacon-publish-placeholder");
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

  it("never writes into credential/authentication fields (Marketplace guideline)", () => {
    const applyValue = new Function(`${beaconPropApplyValueRuntimeSource()}; return applyValue;`)() as (
      el: Element,
      v: string
    ) => void;

    const password = document.createElement("input");
    password.type = "password";
    applyValue(password, "leaked");
    expect((password as HTMLInputElement).value).toBe("");

    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.value = "csrf-token";
    applyValue(hidden, "overwritten");
    expect((hidden as HTMLInputElement).value).toBe("csrf-token");

    const currentPassword = document.createElement("input");
    currentPassword.type = "text";
    currentPassword.setAttribute("autocomplete", "current-password");
    applyValue(currentPassword, "leaked");
    expect((currentPassword as HTMLInputElement).value).toBe("");

    const otp = document.createElement("input");
    otp.setAttribute("autocomplete", "one-time-code");
    applyValue(otp, "123456");
    expect((otp as HTMLInputElement).value).toBe("");

    const username = document.createElement("input");
    username.setAttribute("autocomplete", "username");
    applyValue(username, "someone");
    expect((username as HTMLInputElement).value).toBe("");

    // Non-credential inputs still receive values.
    const plain = document.createElement("input");
    plain.type = "text";
    applyValue(plain, "hello");
    expect((plain as HTMLInputElement).value).toBe("hello");

    const textarea = document.createElement("textarea");
    applyValue(textarea, "note");
    expect((textarea as HTMLTextAreaElement).value).toBe("note");

    const credentialTextarea = document.createElement("textarea");
    credentialTextarea.setAttribute("autocomplete", "current-password");
    applyValue(credentialTextarea, "leaked");
    expect((credentialTextarea as HTMLTextAreaElement).value).toBe("");
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

  it("link apply path rejects javascript: URLs", () => {
    const applyValue = new Function(`${beaconPropApplyValueRuntimeSource()}; return applyValue;`)() as (
      el: Element,
      v: string
    ) => void;

    const a = document.createElement("a");
    applyValue(a, JSON.stringify({ k: "url", h: "javascript:evil()", t: 1 }));
    expect(a.getAttribute("href")).toBe("#");
  });

  it("never assigns iframe/embed/object sources — embeds are not a runtime surface (Marketplace round 6)", () => {
    const applyValue = new Function(`${beaconPropApplyValueRuntimeSource()}; return applyValue;`)() as (
      el: Element,
      v: string
    ) => void;

    // Even a well-formed https URL must not be applied: externally hosted embeds would otherwise be
    // an independently changeable app surface. The element is left completely untouched.
    for (const tag of ["iframe", "embed", "object"] as const) {
      const el = document.createElement(tag);
      applyValue(el, "https://player.example/v/1");
      expect(el.getAttribute("src")).toBeNull();
      expect(el.textContent).toBe("");
    }

    const seeded = document.createElement("iframe");
    seeded.setAttribute("src", "https://original.example/embed");
    applyValue(seeded, "https://attacker.example/embed");
    expect(seeded.getAttribute("src")).toBe("https://original.example/embed");
  });

  it("image src gate: https / protocol-relative / relative apply; http:, data:, blob: and other schemes do not", () => {
    const applyValue = new Function(`${beaconPropApplyValueRuntimeSource()}; return applyValue;`)() as (
      el: Element,
      v: string
    ) => void;

    // Canonical https URL applies.
    const ok = document.createElement("img");
    applyValue(ok, "https://cdn.example.com/a.webp");
    expect(ok.getAttribute("src")).toBe("https://cdn.example.com/a.webp");

    // Protocol-relative and site-relative paths inherit the published page's https origin.
    const rel = document.createElement("img");
    applyValue(rel, "/assets/a.png");
    expect(rel.getAttribute("src")).toBe("/assets/a.png");
    const proto = document.createElement("img");
    applyValue(proto, "//cdn.example.com/a.png");
    expect(proto.getAttribute("src")).toBe("//cdn.example.com/a.png");

    // Rejected schemes are not applied at all — no partial application, existing src untouched.
    for (const bad of [
      "http://cdn.example.com/a.png",
      "data:image/svg+xml,<svg/>",
      "blob:https://x/y",
      "javascript:evil()",
      "java\nscript:evil()",
    ]) {
      const img = document.createElement("img");
      img.setAttribute("src", "https://keep.example/orig.png");
      applyValue(img, bad);
      expect(img.getAttribute("src")).toBe("https://keep.example/orig.png");

      // Direct PICTURE binding runs the container path; the same gate holds there.
      const picture = document.createElement("picture");
      const source = document.createElement("source");
      const nested = document.createElement("img");
      picture.append(source, nested);
      applyValue(picture, bad);
      expect(source.getAttribute("srcset")).toBeNull();
      expect(nested.getAttribute("src")).toBeNull();
    }
  });
});

/**
 * Control-character scheme-obfuscation payloads. Browsers remove every C0 control character from a URL before
 * parsing its scheme, so each of these navigates as `javascript:` / `data:` / `vbscript:` even though the raw
 * string does not match a `^scheme:` test. Mirrors the corpus pinned against `isSafeRichTextUrl` in
 * `shared/ui/rich-text-editor/__tests__/rich-text-url.test.ts` — the two implementations must agree.
 */
const CONTROL_CHAR_OBFUSCATED_URLS = [
  "java\nscript:alert(1)",
  "java\rscript:alert(1)",
  "java\tscript:alert(1)",
  "java\x00script:alert(1)",
  "j\x0bavascript:alert(1)",
  "\x01javascript:alert(1)",
  "\njavascript:alert(1)",
  "JAVA\tSCRIPT:alert(1)",
  "dat\na:text/html,x",
  "\x00data:text/html;base64,PHNjcmlwdD4=",
  "vb\tscript:msgbox",
] as const;

function loadRuntimeUrlGuards(): {
  bStripCtl: (h: string) => string;
  bSafeHref: (h: unknown) => string | null;
} {
  return new Function(
    `${beaconPropApplyValueRuntimeSource()}; return { bStripCtl: bStripCtl, bSafeHref: bSafeHref };`
  )() as { bStripCtl: (h: string) => string; bSafeHref: (h: unknown) => string | null };
}

describe("beacon footer runtime bStripCtl (minified twin of stripUrlControlCharacters)", () => {
  it("returns the canonical value unchanged", () => {
    const { bStripCtl } = loadRuntimeUrlGuards();
    expect(bStripCtl("https://example.com/a?b=c#d")).toBe("https://example.com/a?b=c#d");
  });

  it("removes C0 control characters from anywhere in the value", () => {
    const { bStripCtl } = loadRuntimeUrlGuards();
    expect(bStripCtl("java\nscript:alert(1)")).toBe("javascript:alert(1)");
    expect(bStripCtl("java\tscript:alert(1)")).toBe("javascript:alert(1)");
    expect(bStripCtl("java\rscript:alert(1)")).toBe("javascript:alert(1)");
    expect(bStripCtl("java\x00script:alert(1)")).toBe("javascript:alert(1)");
    expect(bStripCtl("\x01javascript:alert(1)")).toBe("javascript:alert(1)");
  });

  it("trims surrounding whitespace but preserves interior spaces", () => {
    const { bStripCtl } = loadRuntimeUrlGuards();
    expect(bStripCtl("  https://example.com  ")).toBe("https://example.com");
    expect(bStripCtl("mailto:a@b.com?subject=hello world&body=one two")).toBe(
      "mailto:a@b.com?subject=hello world&body=one two"
    );
  });

  it("collapses whitespace-only and empty input to an empty string", () => {
    const { bStripCtl } = loadRuntimeUrlGuards();
    expect(bStripCtl("")).toBe("");
    expect(bStripCtl("   ")).toBe("");
    expect(bStripCtl("\n\t\r")).toBe("");
  });
});

describe("beacon footer runtime bSafeHref (minified twin of isSafeRichTextUrl)", () => {
  it("returns the control-stripped href for navigational schemes", () => {
    const { bSafeHref } = loadRuntimeUrlGuards();
    for (const url of ["https://x.com", "mailto:a@b.com", "tel:+15551234"]) {
      expect(bSafeHref(url)).toBe(url);
    }
    expect(bSafeHref("HTTPS://EX.COM")).toBe("HTTPS://EX.COM");
  });

  it("rejects http: (transport downgrade) and sms: — https is the only web scheme (Marketplace round 6)", () => {
    const { bSafeHref } = loadRuntimeUrlGuards();
    for (const url of ["http://x.com", "HTTP://X.COM", "http://x.com/path?q=1", "sms:+15551234", "SMS:+15551234"]) {
      expect(bSafeHref(url)).toBeNull();
    }
  });

  it("returns the control-stripped href for relative / anchor / protocol-relative links", () => {
    const { bSafeHref } = loadRuntimeUrlGuards();
    for (const url of ["/relative", "#anchor", "path/to", "//host/path"]) {
      expect(bSafeHref(url)).toBe(url);
    }
  });

  it("writes the stripped string, not the raw one (that value reaches the DOM)", () => {
    const { bSafeHref } = loadRuntimeUrlGuards();
    expect(bSafeHref("  https://example.com\n")).toBe("https://example.com");
    expect(bSafeHref("htt\nps://example.com")).toBe("https://example.com");
    expect(bSafeHref("/rel\tative")).toBe("/relative");
  });

  it("preserves a mailto: query string containing interior spaces", () => {
    const { bSafeHref } = loadRuntimeUrlGuards();
    const mailto = "mailto:a@b.com?subject=hello world&body=one two";
    expect(bSafeHref(mailto)).toBe(mailto);
  });

  it("rejects dangerous and empty schemes", () => {
    const { bSafeHref } = loadRuntimeUrlGuards();
    for (const url of [
      "",
      "   ",
      "\n\t",
      "javascript:alert(1)",
      "data:text/html,x",
      "vbscript:msgbox",
      "JavaScript:alert(1)",
      "DATA:text/html,x",
    ]) {
      expect(bSafeHref(url)).toBeNull();
    }
  });

  // Regression: the `^[a-z][a-z0-9+.-]*:` rejection test does not match when a control character sits mid-scheme,
  // so these values used to be misclassified as harmless relative paths while browsers still executed them.
  it("rejects control-character-obfuscated dangerous schemes", () => {
    const { bSafeHref } = loadRuntimeUrlGuards();
    for (const url of CONTROL_CHAR_OBFUSCATED_URLS) {
      expect(bSafeHref(url)).toBeNull();
    }
  });

  it("treats null / undefined as empty", () => {
    const { bSafeHref } = loadRuntimeUrlGuards();
    expect(bSafeHref(null)).toBeNull();
    expect(bSafeHref(undefined)).toBeNull();
  });

  it("blocks control-character-obfuscated hrefs end-to-end through applyValue", () => {
    const applyValue = new Function(`${beaconPropApplyValueRuntimeSource()}; return applyValue;`)() as (
      el: Element,
      v: string
    ) => void;

    for (const url of CONTROL_CHAR_OBFUSCATED_URLS) {
      const a = document.createElement("a");
      applyValue(a, JSON.stringify({ k: "url", h: url, t: 1 }));
      expect(a.getAttribute("href")).toBe("#");

      const iframe = document.createElement("iframe");
      applyValue(iframe, url);
      expect(iframe.getAttribute("src")).toBeNull();
    }

    // The rich-text sanitizer unwraps anchors whose obfuscated href is rejected, keeping only the text.
    const marked = document.createElement("div");
    marked.setAttribute("data-cb-html", "1");
    marked.innerHTML = "";
    applyValue(marked, '<p><a href="java\nscript:alert(1)">txt</a></p>');
    expect(marked.querySelector("a")).toBeNull();
    expect(marked.textContent).toContain("txt");
  });
});
