import { describe, expect, it } from "vitest";
import { normalizeAccessEmail, parseTeamMemberEmailsInput } from "@/shared/lib/access/email-input";

describe("normalizeAccessEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeAccessEmail("  User@Example.COM ")).toBe("user@example.com");
  });
});

describe("parseTeamMemberEmailsInput", () => {
  it("dedupes, excludes primary email, and normalizes", () => {
    expect(
      parseTeamMemberEmailsInput([" Teammate@Example.com ", "teammate@example.com", "User@Example.com"], {
        excludeEmail: "user@example.com",
      })
    ).toEqual(["teammate@example.com"]);
  });

  it("returns empty array when omitted", () => {
    expect(parseTeamMemberEmailsInput(null)).toEqual([]);
  });

  it("rejects invalid entries", () => {
    expect(parseTeamMemberEmailsInput(["not-an-email"])).toBeNull();
  });
});

describe("operator invite header", () => {
  it("exports stable header name", async () => {
    const { TOWER_OPERATOR_INVITE_HEADER } = await import("@/shared/lib/access/operator-invite-header");
    expect(TOWER_OPERATOR_INVITE_HEADER).toBe("x-codalyn-operator-invite");
  });
});

describe("early access feature flag", () => {
  it("is off by default", async () => {
    const prev = process.env.TOWER_EARLY_ACCESS_GATE;
    delete process.env.TOWER_EARLY_ACCESS_GATE;
    const { isTowerEarlyAccessGateEnabled } = await import("@/server/access/early-access-feature");
    expect(isTowerEarlyAccessGateEnabled()).toBe(false);
    process.env.TOWER_EARLY_ACCESS_GATE = prev;
  });

  it("is on for 1", async () => {
    const prev = process.env.TOWER_EARLY_ACCESS_GATE;
    process.env.TOWER_EARLY_ACCESS_GATE = "1";
    const { isTowerEarlyAccessGateEnabled } = await import("@/server/access/early-access-feature");
    expect(isTowerEarlyAccessGateEnabled()).toBe(true);
    process.env.TOWER_EARLY_ACCESS_GATE = prev;
  });
});
