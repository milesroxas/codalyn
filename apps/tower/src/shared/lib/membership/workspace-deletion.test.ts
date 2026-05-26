import { describe, expect, it } from "vitest";
import {
  assertWorkspaceSlugConfirmation,
  workspaceSlugConfirmationMatches,
} from "@/shared/lib/membership/workspace-deletion";

describe("workspaceSlugConfirmationMatches", () => {
  it("matches slug case-insensitively with surrounding whitespace", () => {
    expect(workspaceSlugConfirmationMatches("  AcMe  ", "acme")).toBe(true);
  });

  it("rejects mismatched slug", () => {
    expect(workspaceSlugConfirmationMatches("other", "acme")).toBe(false);
  });
});

describe("assertWorkspaceSlugConfirmation", () => {
  it("returns confirm_mismatch when slug does not match", () => {
    expect(assertWorkspaceSlugConfirmation("wrong", "acme")).toEqual({ ok: false, code: "confirm_mismatch" });
  });

  it("accepts matching slug", () => {
    expect(assertWorkspaceSlugConfirmation("acme", "acme")).toEqual({ ok: true });
  });
});
