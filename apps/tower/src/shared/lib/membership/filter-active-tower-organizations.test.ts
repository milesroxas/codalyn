import { describe, expect, it } from "vitest";
import {
  filterActiveTowerOrganizations,
  isActiveTowerOrganization,
  resolveActiveTowerOrganization,
} from "@/shared/lib/membership/filter-active-tower-organizations";

describe("isActiveTowerOrganization", () => {
  it("treats null and undefined deletedAt as active", () => {
    expect(isActiveTowerOrganization({ id: "a", deletedAt: null })).toBe(true);
    expect(isActiveTowerOrganization({ id: "a" })).toBe(true);
  });

  it("treats set deletedAt as inactive", () => {
    expect(isActiveTowerOrganization({ id: "a", deletedAt: new Date() })).toBe(false);
    expect(isActiveTowerOrganization({ id: "a", deletedAt: "2026-01-01T00:00:00.000Z" })).toBe(false);
  });
});

describe("filterActiveTowerOrganizations", () => {
  it("removes soft-deleted rows", () => {
    const rows = [
      { id: "active", deletedAt: null },
      { id: "deleted", deletedAt: "2026-01-01T00:00:00.000Z" },
    ];
    expect(filterActiveTowerOrganizations(rows).map((r) => r.id)).toEqual(["active"]);
  });
});

describe("resolveActiveTowerOrganization", () => {
  it("returns null for soft-deleted active org", () => {
    expect(resolveActiveTowerOrganization({ id: "x", deletedAt: new Date() })).toBeNull();
  });
});
