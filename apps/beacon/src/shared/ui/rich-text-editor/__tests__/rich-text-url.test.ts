import { describe, expect, it } from "vitest";
import { isSafeRichTextUrl, stripUrlControlCharacters } from "@/shared/ui/rich-text-editor/lib/rich-text-url";

/**
 * Control-character scheme-obfuscation payloads. Browsers remove every C0 control character from a URL before
 * parsing its scheme, so each of these navigates as `javascript:` / `data:` / `vbscript:` even though the raw
 * string does not match a `^scheme:` test. The footer-runtime twin's suite
 * (`cms-slot-beacon-prop-runtime.test.ts`) pins `bSafeHref` against the same corpus.
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

describe("stripUrlControlCharacters", () => {
  it("returns the canonical value unchanged", () => {
    expect(stripUrlControlCharacters("https://example.com/a?b=c#d")).toBe("https://example.com/a?b=c#d");
  });

  it("removes C0 control characters from anywhere in the value", () => {
    expect(stripUrlControlCharacters("java\nscript:alert(1)")).toBe("javascript:alert(1)");
    expect(stripUrlControlCharacters("java\tscript:alert(1)")).toBe("javascript:alert(1)");
    expect(stripUrlControlCharacters("java\rscript:alert(1)")).toBe("javascript:alert(1)");
    expect(stripUrlControlCharacters("java\x00script:alert(1)")).toBe("javascript:alert(1)");
    expect(stripUrlControlCharacters("\x01javascript:alert(1)")).toBe("javascript:alert(1)");
  });

  it("trims surrounding whitespace but preserves interior spaces", () => {
    expect(stripUrlControlCharacters("  https://example.com  ")).toBe("https://example.com");
    expect(stripUrlControlCharacters("mailto:a@b.com?subject=hello world&body=one two")).toBe(
      "mailto:a@b.com?subject=hello world&body=one two"
    );
  });

  it("collapses whitespace-only and empty input to an empty string", () => {
    expect(stripUrlControlCharacters("")).toBe("");
    expect(stripUrlControlCharacters("   ")).toBe("");
    expect(stripUrlControlCharacters("\n\t\r")).toBe("");
  });

  it("preserves non-ASCII and surrogate-pair characters", () => {
    expect(stripUrlControlCharacters("https://example.com/é\u{1f600}")).toBe("https://example.com/é\u{1f600}");
  });
});

describe("isSafeRichTextUrl", () => {
  it("allows navigational schemes", () => {
    for (const url of [
      "https://x.com",
      "http://x.com",
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
    for (const url of ["/relative", "/path", "#anchor", "path/to", "//host/path", "//cdn.example.com/x"]) {
      expect(isSafeRichTextUrl(url)).toBe(true);
    }
  });

  it("preserves a mailto: query string containing interior spaces", () => {
    const mailto = "mailto:a@b.com?subject=hello world&body=one two";
    expect(isSafeRichTextUrl(mailto)).toBe(true);
    expect(stripUrlControlCharacters(mailto)).toBe(mailto);
  });

  it("rejects dangerous and empty schemes", () => {
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
      expect(isSafeRichTextUrl(url)).toBe(false);
    }
  });

  // Regression: the `^[a-z][a-z0-9+.-]*:` rejection test does not match when a control character sits mid-scheme,
  // so these values used to be misclassified as harmless relative paths while browsers still executed them.
  it("rejects control-character-obfuscated dangerous schemes", () => {
    for (const url of CONTROL_CHAR_OBFUSCATED_URLS) {
      expect(isSafeRichTextUrl(url)).toBe(false);
    }
  });

  it("still allows a safe scheme carrying stray control characters", () => {
    expect(isSafeRichTextUrl("htt\nps://example.com")).toBe(true);
    expect(isSafeRichTextUrl("  https://example.com\n")).toBe(true);
  });
});
