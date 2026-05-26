import { describe, expect, it } from "vitest";
import {
  normalizeWorkspaceSlugInput,
  parseWorkspaceSlug,
  slugifyWorkspaceName,
  WORKSPACE_SLUG_MAX_LENGTH,
} from "@/shared/lib/membership/workspace-slug";

describe("normalizeWorkspaceSlugInput", () => {
  it("lowercases, trims, and collapses separators", () => {
    expect(normalizeWorkspaceSlugInput("  Acme--Team  ")).toBe("acme-team");
  });

  it("strips invalid characters", () => {
    expect(normalizeWorkspaceSlugInput("foo_bar.baz")).toBe("foo-bar-baz");
  });

  it("returns empty for punctuation-only input", () => {
    expect(normalizeWorkspaceSlugInput("---")).toBe("");
  });
});

describe("slugifyWorkspaceName", () => {
  it("derives a slug from a display name", () => {
    expect(slugifyWorkspaceName("Acme Studio")).toBe("acme-studio");
  });

  it("falls back when the name has no slug characters", () => {
    expect(slugifyWorkspaceName("***")).toBe("team");
  });

  it("truncates to the max length", () => {
    const longName = "a".repeat(WORKSPACE_SLUG_MAX_LENGTH + 10);
    expect(slugifyWorkspaceName(longName).length).toBe(WORKSPACE_SLUG_MAX_LENGTH);
  });
});

describe("parseWorkspaceSlug", () => {
  it("accepts a canonical slug", () => {
    expect(parseWorkspaceSlug("acme-team")).toEqual({ ok: true, slug: "acme-team" });
  });

  it("normalizes equivalent input", () => {
    expect(parseWorkspaceSlug(" Acme-Team ")).toEqual({ ok: true, slug: "acme-team" });
  });

  it("rejects empty input", () => {
    expect(parseWorkspaceSlug("   ")).toEqual({ ok: false, error: "slug_empty" });
  });

  it("rejects malformed slugs", () => {
    expect(parseWorkspaceSlug({ value: "acme" })).toEqual({ ok: false, error: "invalid_slug" });
  });

  it("rejects reserved slugs", () => {
    expect(parseWorkspaceSlug("console")).toEqual({ ok: false, error: "slug_reserved" });
  });

  it("rejects slugs over the max length after normalization", () => {
    const slug = `a-${"b".repeat(WORKSPACE_SLUG_MAX_LENGTH)}`;
    expect(parseWorkspaceSlug(slug)).toEqual({ ok: false, error: "invalid_slug" });
  });
});
