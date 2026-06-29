/** @vitest-environment jsdom */

import { $getRoot, createEditor } from "lexical";
import { describe, expect, it } from "vitest";
import { isRichTextHtmlEmpty } from "@/shared/ui/rich-text-editor/lib/rich-text-empty";
import {
  appendHtmlNodesToRoot,
  htmlToLexicalNodes,
  lexicalToHtml,
} from "@/shared/ui/rich-text-editor/lib/rich-text-html";
import { RICH_TEXT_NODES } from "@/shared/ui/rich-text-editor/rich-text-editor-config";

/** Imports `html` into a headless editor over the allowlist, then re-serializes — the same path the plugin runs. */
function roundTrip(html: string): string {
  const editor = createEditor({
    namespace: "test",
    nodes: [...RICH_TEXT_NODES],
    onError: (e) => {
      throw e;
    },
  });
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      appendHtmlNodesToRoot(root, htmlToLexicalNodes(editor, html));
    },
    { discrete: true }
  );
  let out = "";
  editor.getEditorState().read(() => {
    out = lexicalToHtml(editor);
  });
  return out;
}

describe("rich-text HTML round-trip", () => {
  it("preserves canonical formatting", () => {
    const out = roundTrip("<p><strong>x</strong></p>");
    expect(out).toContain("<strong");
    expect(out).toContain("x");
    expect(out).toContain("<p");
  });

  it("normalizes equivalent inline tags (<b>→<strong>, <i>→<em>)", () => {
    expect(roundTrip("<p><b>bold</b></p>")).toContain("<strong");
    expect(roundTrip("<p><i>it</i></p>")).toContain("<em");
  });

  it("imports legacy plain text as a single paragraph", () => {
    const out = roundTrip("hello world");
    expect(out).toContain("<p");
    expect(out).toContain("hello world");
    expect(isRichTextHtmlEmpty(out)).toBe(false);
  });

  it("wraps a top-level inline link in a paragraph", () => {
    const out = roundTrip('<a href="https://example.com">link</a>');
    expect(out).toContain("<p");
    expect(out).toContain("<a");
    expect(out).toContain("https://example.com");
  });

  it("keeps lists and headings", () => {
    const list = roundTrip("<ul><li>a</li><li>b</li></ul>");
    expect(list).toContain("<ul");
    expect(list).toContain("<li");
    const heading = roundTrip("<h2>Title</h2>");
    expect(heading).toContain("<h2");
  });

  it("empty / missing input yields an empty document", () => {
    expect(isRichTextHtmlEmpty(roundTrip(""))).toBe(true);
    expect(isRichTextHtmlEmpty(roundTrip("   "))).toBe(true);
  });

  it("does not throw on malformed/unbalanced HTML", () => {
    expect(() => roundTrip("<p><strong>oops</p>")).not.toThrow();
    expect(() => roundTrip("<ul><li>a")).not.toThrow();
  });
});
