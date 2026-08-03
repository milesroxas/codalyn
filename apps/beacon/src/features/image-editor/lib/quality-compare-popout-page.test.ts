import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { QUALITY_COMPARE_POPOUT_PAGE } from "@/features/image-editor/lib/open-quality-compare-popout";
import {
  BEACON_QUALITY_PARENT_SOURCE,
  BEACON_QUALITY_POPOUT_SOURCE,
} from "@/features/image-editor/lib/quality-popout-protocol";

/**
 * The compare popout is a static page in public/ (shipped verbatim into dist/), so its script
 * cannot import the protocol module — these tests pin the duplicated constants and the page's
 * CSP posture (no inline script/style) against drift.
 */
function readPublicFile(name: string): string {
  return readFileSync(fileURLToPath(new URL(`../../../../public/${name}`, import.meta.url)), "utf-8");
}

describe("quality-compare popout static page", () => {
  const html = readPublicFile(QUALITY_COMPARE_POPOUT_PAGE);
  const js = readPublicFile("quality-compare.js");

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

  it("references its external assets", () => {
    expect(html).toContain('src="./quality-compare.js"');
    expect(html).toContain('href="./quality-compare.css"');
  });

  it("duplicated protocol constants match quality-popout-protocol.ts", () => {
    expect(js).toContain(`const POPOUT_SOURCE = ${JSON.stringify(BEACON_QUALITY_POPOUT_SOURCE)};`);
    expect(js).toContain(`const PARENT_SOURCE = ${JSON.stringify(BEACON_QUALITY_PARENT_SOURCE)};`);
  });

  it("accepts messages only from the exact opener window (origin + source check)", () => {
    expect(js).toContain("e.origin !== TARGET_ORIGIN || !window.opener || e.source !== window.opener");
  });

  it("posts only to the opener with an explicit non-wildcard target origin", () => {
    expect(js).not.toContain('"*"');
    const postMessageCalls = js.match(/window\.opener\.postMessage\([^;]*\)/g) ?? [];
    expect(postMessageCalls.length).toBeGreaterThan(0);
    for (const call of postMessageCalls) {
      expect(call).toContain("TARGET_ORIGIN");
    }
  });

  it("speaks the full popout protocol", () => {
    for (const marker of [
      "ready",
      "init",
      "preview-quality-changed",
      "save-and-close",
      "compressed-updated",
      "compressed-error",
    ]) {
      expect(js).toContain(`"${marker}"`);
    }
  });
});
