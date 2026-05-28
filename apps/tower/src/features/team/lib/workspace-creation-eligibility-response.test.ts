import { describe, expect, it } from "vitest";
import { parseWorkspaceCreationEligibilityPayload } from "@/features/team/lib/workspace-creation-eligibility-response";

describe("parseWorkspaceCreationEligibilityPayload", () => {
  it("accepts canonical shape", () => {
    expect(
      parseWorkspaceCreationEligibilityPayload({
        canCreate: true,
        canShowInSwitcher: false,
        ownedWorkspaceCount: 1,
        hasIndividualPro: false,
        viewingTeamWorkspaceWithoutPro: true,
      })
    ).toEqual({
      canCreate: true,
      canShowInSwitcher: false,
      ownedWorkspaceCount: 1,
      hasIndividualPro: false,
      viewingTeamWorkspaceWithoutPro: true,
    });
  });

  it("rejects missing canShowInSwitcher", () => {
    expect(
      parseWorkspaceCreationEligibilityPayload({
        canCreate: true,
        ownedWorkspaceCount: 0,
        hasIndividualPro: false,
      })
    ).toBeNull();
  });

  it("rejects invalid ownedWorkspaceCount", () => {
    expect(
      parseWorkspaceCreationEligibilityPayload({
        canCreate: false,
        canShowInSwitcher: false,
        ownedWorkspaceCount: -1,
        hasIndividualPro: false,
        viewingTeamWorkspaceWithoutPro: false,
      })
    ).toBeNull();
  });

  it("rejects non-object input", () => {
    expect(parseWorkspaceCreationEligibilityPayload(null)).toBeNull();
  });
});
