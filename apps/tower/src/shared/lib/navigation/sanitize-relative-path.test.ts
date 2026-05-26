import { describe, expect, it } from "vitest";
import { sanitizeRelativePath } from "./sanitize-relative-path";

describe("sanitizeRelativePath", () => {
  it("accepts safe in-app paths", () => {
    expect(sanitizeRelativePath("/team")).toBe("/team");
    expect(sanitizeRelativePath("/invitations/accept", "?invitationId=abc")).toBe(
      "/invitations/accept?invitationId=abc"
    );
  });

  it("rejects protocol-relative and off-origin targets", () => {
    expect(sanitizeRelativePath("//evil.test/phish")).toBe("/");
    expect(sanitizeRelativePath("https://evil.test/phish")).toBe("/");
  });
});
