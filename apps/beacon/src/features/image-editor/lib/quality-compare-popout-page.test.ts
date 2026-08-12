import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { QUALITY_COMPARE_POPOUT_PAGE } from "@/features/image-editor/lib/open-quality-compare-popout";
import { isTrustedQualityParentEvent } from "@/features/image-editor/lib/use-quality-popout-bridge";

/**
 * The compare popout is a second Vite HTML entry (apps/beacon/quality-compare.html) rendered by
 * React — its script logic lives in src/ and imports the protocol module directly. These tests pin
 * the source document's CSP posture (no inline script/style) and the opener-trust rule.
 */
const POPOUT_HTML_URL = new URL(`../../../../${QUALITY_COMPARE_POPOUT_PAGE}`, import.meta.url);

describe("quality-compare popout page (Vite entry)", () => {
  const html = readFileSync(fileURLToPath(POPOUT_HTML_URL), "utf-8");

  it("carries no inline script — every <script> tag is src-only and empty-bodied", () => {
    const scriptTags = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) ?? [];
    expect(scriptTags.length).toBeGreaterThan(0);
    for (const tag of scriptTags) {
      expect(tag).toMatch(/<script\b[^>]*\bsrc=/i);
      expect(
        tag
          .replace(/<script\b[^>]*>/i, "")
          .replace(/<\/script>/i, "")
          .trim()
      ).toBe("");
    }
  });

  it("carries no inline style attributes or <style> blocks", () => {
    expect(html).not.toMatch(/<style\b/i);
    expect(html).not.toMatch(/\sstyle\s*=/i);
  });

  it("loads the React entry and the page stylesheet", () => {
    expect(html).toContain('src="/src/quality-compare.tsx"');
    expect(html).toContain('href="/quality-compare.css"');
  });
});

describe("isTrustedQualityParentEvent", () => {
  const ORIGIN = "https://extension.example";
  const opener = { name: "opener" } as unknown as Window;
  const makeEvent = (overrides: { origin?: string; source?: unknown } = {}) =>
    ({
      origin: overrides.origin ?? ORIGIN,
      source: "source" in overrides ? overrides.source : opener,
    }) as MessageEvent;

  it("accepts an event from the opener at the extension origin", () => {
    expect(isTrustedQualityParentEvent(makeEvent(), opener, ORIGIN)).toBe(true);
  });

  it("rejects a foreign origin even when the source is the opener", () => {
    expect(isTrustedQualityParentEvent(makeEvent({ origin: "https://evil.example" }), opener, ORIGIN)).toBe(false);
  });

  it("rejects a same-origin document that is not the opener window", () => {
    const stranger = { name: "stranger" } as unknown as Window;
    expect(isTrustedQualityParentEvent(makeEvent({ source: stranger }), opener, ORIGIN)).toBe(false);
  });

  it("rejects everything when there is no opener", () => {
    expect(isTrustedQualityParentEvent(makeEvent(), null, ORIGIN)).toBe(false);
  });
});
