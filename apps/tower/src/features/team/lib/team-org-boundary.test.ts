import { describe, expect, it } from "vitest";
import {
  countPendingInvitations,
  normalizeInvitationRow,
  normalizeInvitationRows,
  normalizeMemberRow,
  normalizeMemberRows,
  readStringLikeValue,
} from "@/features/team/lib/team-org-boundary";

describe("readStringLikeValue", () => {
  it("reads trimmed strings", () => {
    expect(readStringLikeValue("  admin  ")).toBe("admin");
  });

  it("reads wrapped value objects", () => {
    expect(readStringLikeValue({ value: "editor" })).toBe("editor");
  });

  it("returns null for empty or non-string values", () => {
    expect(readStringLikeValue("")).toBeNull();
    expect(readStringLikeValue(42)).toBeNull();
    expect(readStringLikeValue(null)).toBeNull();
  });
});

describe("normalizeMemberRow", () => {
  it("normalizes canonical member shape", () => {
    expect(
      normalizeMemberRow({
        id: "m1",
        userId: "u1",
        role: "admin",
        user: { id: "u1", name: "Ada", email: "ada@example.com" },
      })
    ).toEqual({
      id: "m1",
      userId: "u1",
      role: "admin",
      user: { id: "u1", name: "Ada", email: "ada@example.com" },
    });
  });

  it("rejects malformed member rows", () => {
    expect(normalizeMemberRow({ id: "m1", userId: "u1", role: "admin" })).toBeNull();
    expect(normalizeMemberRow(null)).toBeNull();
  });
});

describe("normalizeMemberRows", () => {
  it("filters invalid rows", () => {
    expect(
      normalizeMemberRows([
        { id: "m1", userId: "u1", role: "admin", user: { id: "u1", name: "", email: "a@b.com" } },
        { id: "bad" },
      ])
    ).toHaveLength(1);
  });

  it("returns empty array for non-arrays", () => {
    expect(normalizeMemberRows(undefined)).toEqual([]);
  });
});

describe("normalizeInvitationRow", () => {
  it("normalizes canonical invitation shape", () => {
    expect(
      normalizeInvitationRow({
        id: "i1",
        email: "invitee@example.com",
        role: "editor",
        status: "pending",
        expiresAt: "2026-01-01T00:00:00.000Z",
      })
    ).toEqual({
      id: "i1",
      email: "invitee@example.com",
      role: "editor",
      status: "pending",
      expiresAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("accepts alternate expiresAt shapes", () => {
    const expiresAt = new Date("2026-01-01T00:00:00.000Z");
    expect(
      normalizeInvitationRow({
        id: "i1",
        email: "invitee@example.com",
        role: null,
        status: "accepted",
        expiresAt,
      })
    ).toEqual({
      id: "i1",
      email: "invitee@example.com",
      role: null,
      status: "accepted",
      expiresAt,
    });
  });

  it("rejects partial invitation rows", () => {
    expect(normalizeInvitationRow({ id: "i1", email: "a@b.com" })).toBeNull();
  });
});

describe("normalizeInvitationRows", () => {
  it("filters invalid rows", () => {
    expect(
      normalizeInvitationRows([
        { id: "i1", email: "a@b.com", status: "pending" },
        { email: "missing-id@b.com", status: "pending" },
      ])
    ).toHaveLength(1);
  });
});

describe("countPendingInvitations", () => {
  it("counts only pending invitations", () => {
    expect(
      countPendingInvitations([
        { id: "1", email: "a@b.com", role: "editor", status: "pending" },
        { id: "2", email: "c@d.com", role: "editor", status: "accepted" },
      ])
    ).toBe(1);
  });
});
