import { describe, expect, it } from "vitest";
import {
  parseOrganizationMemberRole,
  parseTowerTeamRole,
  TOWER_TEAM_ROLES,
} from "@/shared/lib/membership/tower-organization-access";

describe("parseTowerTeamRole", () => {
  it("accepts canonical team roles", () => {
    for (const role of TOWER_TEAM_ROLES) {
      expect(parseTowerTeamRole(role)).toBe(role);
    }
  });

  it("rejects unknown roles", () => {
    expect(parseTowerTeamRole("superadmin")).toBeNull();
  });
});

describe("parseOrganizationMemberRole", () => {
  it("accepts owner and member aliases", () => {
    expect(parseOrganizationMemberRole("owner")).toBe("owner");
    expect(parseOrganizationMemberRole("member")).toBe("member");
  });

  it("delegates team roles to parseTowerTeamRole", () => {
    expect(parseOrganizationMemberRole("designer")).toBe("designer");
  });
});
