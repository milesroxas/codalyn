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
});
