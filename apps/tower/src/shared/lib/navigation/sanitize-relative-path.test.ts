import { describe, expect, it } from "vitest";
import { sanitizeRelativePath } from "./sanitize-relative-path";

describe("sanitizeRelativePath", () => {
  it("accepts safe in-app paths", () => {
    expect(sanitizeRelativePath("/team")).toBe("/team");
    expect(sanitizeRelativePath("/")).toBe("/");
    expect(sanitizeRelativePath("/invitations/accept", "?invitationId=abc")).toBe(
      "/invitations/accept?invitationId=abc"
    );
    expect(sanitizeRelativePath("/team", "?a=1&b=2")).toBe("/team?a=1&b=2");
    expect(sanitizeRelativePath("/team#section")).toBe("/team#section");
  });

  it("rejects protocol-relative and off-origin targets", () => {
    expect(sanitizeRelativePath("//evil.test/phish")).toBe("/");
    expect(sanitizeRelativePath("https://evil.test/phish")).toBe("/");
    expect(sanitizeRelativePath("http://evil.test")).toBe("/");
    expect(sanitizeRelativePath("")).toBe("/");
    expect(sanitizeRelativePath("evil.test")).toBe("/");
  });

  it("rejects backslash open-redirect bypasses (browsers treat \\ as /)", () => {
    // Empirically resolved to https://evil.com/ via new URL(path, origin) before this fix.
    expect(sanitizeRelativePath("/\\evil.com")).toBe("/");
    expect(sanitizeRelativePath("/\\\\evil.com")).toBe("/");
    expect(sanitizeRelativePath("/\\/evil.com")).toBe("/");
  });

  it("rejects tab / CR / LF smuggling that reveals a foreign origin", () => {
    expect(sanitizeRelativePath("/\t/evil.com")).toBe("/");
    expect(sanitizeRelativePath("/\r/\nevil.com")).toBe("/");
    expect(sanitizeRelativePath("/\\\tevil.com")).toBe("/");
  });

  it("strips smuggled CR/LF from an otherwise same-origin path", () => {
    // Header-injection defense: the reconstructed value is rebuilt from the parsed URL.
    const out = sanitizeRelativePath("/app\r\nSet-Cookie:x=1");
    expect(out.includes("\r")).toBe(false);
    expect(out.includes("\n")).toBe(false);
    expect(out.startsWith("/app")).toBe(true);
  });
});
