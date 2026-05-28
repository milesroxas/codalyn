import { describe, expect, it } from "vitest";
import { formatTeamWorkspaceLeaveError, TeamWorkspaceLeaveApiError } from "@/features/team/api/leave-workspace";

describe("formatTeamWorkspaceLeaveError", () => {
  it("maps workspace owner blockers to actionable copy", () => {
    expect(formatTeamWorkspaceLeaveError(new TeamWorkspaceLeaveApiError("workspace_owner", 403))).toContain(
      "transfer ownership"
    );
  });

  it("maps billing owner blockers to actionable copy", () => {
    expect(formatTeamWorkspaceLeaveError(new TeamWorkspaceLeaveApiError("billing_owner", 403))).toContain(
      "billing responsibility"
    );
  });
});
