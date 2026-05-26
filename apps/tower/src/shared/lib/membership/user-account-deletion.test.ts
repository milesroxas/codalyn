import { describe, expect, it } from "vitest";
import {
  computeUserAccountDeletionPlan,
  formatSoleAdminWorkspacesMessage,
} from "@/shared/lib/membership/user-account-deletion";

const userId = "user-1";

describe("computeUserAccountDeletionPlan", () => {
  it("allows deletion when user is not a workspace admin", () => {
    const plan = computeUserAccountDeletionPlan(userId, [
      {
        organizationId: "org-1",
        organizationName: "Acme",
        organizationSlug: "acme",
        members: [
          { userId, role: "designer" },
          { userId: "user-2", role: "admin" },
        ],
      },
    ]);

    expect(plan).toEqual({ blockers: [], soleMemberOrganizationIds: [] });
  });

  it("blocks deletion when user is the only admin of a shared workspace", () => {
    const plan = computeUserAccountDeletionPlan(userId, [
      {
        organizationId: "org-1",
        organizationName: "Acme",
        organizationSlug: "acme",
        members: [
          { userId, role: "admin" },
          { userId: "user-2", role: "designer" },
        ],
      },
    ]);

    expect(plan.blockers).toEqual([
      {
        organizationId: "org-1",
        organizationName: "Acme",
        organizationSlug: "acme",
        otherMemberCount: 1,
      },
    ]);
    expect(plan.soleMemberOrganizationIds).toEqual([]);
  });

  it("marks sole-member admin workspaces for cleanup", () => {
    const plan = computeUserAccountDeletionPlan(userId, [
      {
        organizationId: "org-1",
        organizationName: "Solo",
        organizationSlug: "solo",
        members: [{ userId, role: "admin" }],
      },
    ]);

    expect(plan.blockers).toEqual([]);
    expect(plan.soleMemberOrganizationIds).toEqual(["org-1"]);
  });

  it("allows deletion when another admin remains", () => {
    const plan = computeUserAccountDeletionPlan(userId, [
      {
        organizationId: "org-1",
        organizationName: "Acme",
        organizationSlug: "acme",
        members: [
          { userId, role: "admin" },
          { userId: "user-2", role: "owner" },
        ],
      },
    ]);

    expect(plan).toEqual({ blockers: [], soleMemberOrganizationIds: [] });
  });
});

describe("formatSoleAdminWorkspacesMessage", () => {
  it("names a single blocked workspace", () => {
    expect(
      formatSoleAdminWorkspacesMessage([
        {
          organizationId: "org-1",
          organizationName: "Acme",
          organizationSlug: "acme",
          otherMemberCount: 2,
        },
      ])
    ).toContain("Acme");
  });

  it("lists multiple blocked workspaces", () => {
    const message = formatSoleAdminWorkspacesMessage([
      {
        organizationId: "org-1",
        organizationName: "Acme",
        organizationSlug: "acme",
        otherMemberCount: 1,
      },
      {
        organizationId: "org-2",
        organizationName: "Beta",
        organizationSlug: "beta",
        otherMemberCount: 3,
      },
    ]);

    expect(message).toContain("Acme");
    expect(message).toContain("Beta");
  });
});
