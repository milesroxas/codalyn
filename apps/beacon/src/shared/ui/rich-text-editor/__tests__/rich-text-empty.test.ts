import { describe, expect, it } from "vitest";
import { isRichTextHtmlEmpty } from "@/shared/ui/rich-text-editor/lib/rich-text-empty";

describe("isRichTextHtmlEmpty", () => {
  it("treats blank / Lexical-empty documents as empty", () => {
    for (const html of [
      "",
      "   ",
      "<p></p>",
      "<p><br></p>",
      "<p>&nbsp;</p>",
      "<p>&#160;</p>",
      "<p> </p>",
      "<ul></ul>",
    ]) {
      expect(isRichTextHtmlEmpty(html)).toBe(true);
    }
  });

  it("treats null/undefined as empty", () => {
    expect(isRichTextHtmlEmpty(null)).toBe(true);
    expect(isRichTextHtmlEmpty(undefined)).toBe(true);
  });

  it("treats documents with visible text as non-empty", () => {
    for (const html of [
      "<p>x</p>",
      "<p><strong>x</strong></p>",
      "<ul><li>x</li></ul>",
      "hello",
      "<blockquote>q</blockquote>",
    ]) {
      expect(isRichTextHtmlEmpty(html)).toBe(false);
    }
  });
});
