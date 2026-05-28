import { describe, expect, it } from "vitest";
import {
  findOrganizationIdBySlug,
  readOrganizationIdFromCreateResponse,
} from "@/features/team/lib/create-workspace-response";

describe("readOrganizationIdFromCreateResponse", () => {
  it("reads a direct id", () => {
    expect(readOrganizationIdFromCreateResponse({ id: "org-1", name: "Mine" })).toBe("org-1");
  });

  it("reads a nested organization id", () => {
    expect(readOrganizationIdFromCreateResponse({ organization: { id: "org-2" } })).toBe("org-2");
  });

  it("returns null for malformed payloads", () => {
    expect(readOrganizationIdFromCreateResponse(null)).toBeNull();
    expect(readOrganizationIdFromCreateResponse({ id: 1 })).toBeNull();
  });
});

describe("findOrganizationIdBySlug", () => {
  it("matches list array and wrapped organizations", () => {
    const rows = [{ id: "a", slug: "alpha" }];
    expect(findOrganizationIdBySlug(rows, "alpha")).toBe("a");
    expect(findOrganizationIdBySlug({ organizations: rows }, "alpha")).toBe("a");
    expect(findOrganizationIdBySlug(rows, "missing")).toBeNull();
  });
});
