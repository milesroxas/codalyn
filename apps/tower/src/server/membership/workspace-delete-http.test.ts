import { describe, expect, it } from "vitest";
import { parseOwnerWorkspaceDeleteBody, workspaceDeletionErrorStatus } from "@/server/membership/workspace-delete-http";

describe("workspaceDeletionErrorStatus", () => {
  it("maps workspace deletion codes to HTTP statuses", () => {
    expect(workspaceDeletionErrorStatus("not_found")).toBe(404);
    expect(workspaceDeletionErrorStatus("forbidden")).toBe(403);
    expect(workspaceDeletionErrorStatus("confirm_mismatch")).toBe(400);
    expect(workspaceDeletionErrorStatus("deletion_incomplete")).toBe(503);
  });
});

describe("parseOwnerWorkspaceDeleteBody", () => {
  it("accepts the canonical shape and trims organizationId", () => {
    expect(parseOwnerWorkspaceDeleteBody({ organizationId: " org-1 ", confirmSlug: "acme", password: "pw" })).toEqual({
      organizationId: "org-1",
      confirmSlug: "acme",
      password: "pw",
    });
  });

  it("rejects non-object bodies", () => {
    expect(parseOwnerWorkspaceDeleteBody(null)).toEqual({ error: "invalid_body" });
    expect(parseOwnerWorkspaceDeleteBody("org-1")).toEqual({ error: "invalid_body" });
  });

  it("rejects missing or blank organizationId", () => {
    expect(parseOwnerWorkspaceDeleteBody({ confirmSlug: "acme", password: "pw" })).toEqual({
      error: "organizationId required",
    });
    expect(parseOwnerWorkspaceDeleteBody({ organizationId: "  ", confirmSlug: "acme", password: "pw" })).toEqual({
      error: "organizationId required",
    });
  });

  it("rejects missing, blank, or wrongly typed confirmSlug", () => {
    expect(parseOwnerWorkspaceDeleteBody({ organizationId: "org-1", password: "pw" })).toEqual({
      error: "confirmSlug required",
    });
    expect(parseOwnerWorkspaceDeleteBody({ organizationId: "org-1", confirmSlug: "  ", password: "pw" })).toEqual({
      error: "confirmSlug required",
    });
    expect(parseOwnerWorkspaceDeleteBody({ organizationId: "org-1", confirmSlug: 42, password: "pw" })).toEqual({
      error: "confirmSlug required",
    });
  });

  it("rejects missing, blank, or wrongly typed password", () => {
    expect(parseOwnerWorkspaceDeleteBody({ organizationId: "org-1", confirmSlug: "acme" })).toEqual({
      error: "password required",
    });
    expect(parseOwnerWorkspaceDeleteBody({ organizationId: "org-1", confirmSlug: "acme", password: " " })).toEqual({
      error: "password required",
    });
    expect(parseOwnerWorkspaceDeleteBody({ organizationId: "org-1", confirmSlug: "acme", password: 42 })).toEqual({
      error: "password required",
    });
  });
});
