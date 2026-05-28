import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/billing/entitlements", () => ({
  resolveTowerEntitlement: vi.fn(),
}));

vi.mock("@/server/membership/user-workspace-creation-eligibility", () => ({
  resolveUserWorkspaceCreationEligibility: vi.fn(),
}));

import { resolveTowerEntitlement } from "@/server/billing/entitlements";
import { resolveUserWorkspaceCreationEligibility } from "@/server/membership/user-workspace-creation-eligibility";
import { resolveWorkspaceCreationUiEligibility } from "@/server/membership/workspace-creation-ui";

describe("resolveWorkspaceCreationUiEligibility", () => {
  it("shows switcher create for invited Team members with no owned workspace", async () => {
    vi.mocked(resolveUserWorkspaceCreationEligibility).mockResolvedValue({
      canCreate: true,
      ownedWorkspaceCount: 0,
      hasIndividualPro: false,
    });
    vi.mocked(resolveTowerEntitlement).mockResolvedValue({ tier: "team", source: "workspace_team" });

    const result = await resolveWorkspaceCreationUiEligibility("user-1", "org-team");
    expect(result.canShowInSwitcher).toBe(true);
    expect(result.viewingTeamWorkspaceWithoutPro).toBe(true);
  });

  it("hides switcher create while viewing a Team workspace after free owned workspace", async () => {
    vi.mocked(resolveUserWorkspaceCreationEligibility).mockResolvedValue({
      canCreate: false,
      ownedWorkspaceCount: 1,
      hasIndividualPro: false,
    });
    vi.mocked(resolveTowerEntitlement).mockResolvedValue({ tier: "team", source: "workspace_team" });

    const result = await resolveWorkspaceCreationUiEligibility("user-1", "org-team");
    expect(result.canShowInSwitcher).toBe(false);
    expect(result.viewingTeamWorkspaceWithoutPro).toBe(true);
  });

  it("allows switcher create for individual Pro on a Team workspace", async () => {
    vi.mocked(resolveUserWorkspaceCreationEligibility).mockResolvedValue({
      canCreate: true,
      ownedWorkspaceCount: 2,
      hasIndividualPro: true,
    });
    vi.mocked(resolveTowerEntitlement).mockResolvedValue({ tier: "team", source: "workspace_team" });

    const result = await resolveWorkspaceCreationUiEligibility("user-1", "org-team");
    expect(result.canShowInSwitcher).toBe(true);
  });
});
