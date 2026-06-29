import { describe, expect, it } from "vitest";
import { isSafeRichTextUrl } from "@/shared/ui/rich-text-editor/lib/rich-text-url";

describe("isSafeRichTextUrl", () => {
  it("allows navigational schemes", () => {
    for (const url of [
      "https://example.com",
      "http://example.com",
      "mailto:a@b.com",
      "tel:+15551234",
      "HTTPS://EX.COM",
    ]) {
      expect(isSafeRichTextUrl(url)).toBe(true);
    }
  });

  it("allows relative / anchor / protocol-relative links", () => {
    for (const url of ["/path", "#anchor", "path/to", "//cdn.example.com/x"]) {
      expect(isSafeRichTextUrl(url)).toBe(true);
    }
  });

  it("rejects dangerous and empty schemes", () => {
    for (const url of [
      "",
      "   ",
      "javascript:alert(1)",
      "data:text/html,x",
      "vbscript:msgbox",
      "JavaScript:alert(1)",
    ]) {
      expect(isSafeRichTextUrl(url)).toBe(false);
    }
  });
});
