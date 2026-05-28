import { beforeEach, describe, expect, it, vi } from "vitest";
import { planOperatorWorkspaceSeatPatch } from "@/server/operator/operator-workspace-seat-patch";

vi.mock("@/server/billing/organization-seat-count", () => ({
  countOrganizationSeatsUsed: vi.fn(),
}));

import { countOrganizationSeatsUsed } from "@/server/billing/organization-seat-count";

const countOrganizationSeatsUsedMock = vi.mocked(countOrganizationSeatsUsed);

describe("planOperatorWorkspaceSeatPatch", () => {
  beforeEach(() => {
    countOrganizationSeatsUsedMock.mockReset();
  });

  it("sets override flag when raising seats on a stripe-managed org", async () => {
    countOrganizationSeatsUsedMock.mockResolvedValue(3);
    await expect(planOperatorWorkspaceSeatPatch("org_1", "sub_1", { seatLimit: 10 })).resolves.toEqual({
      plan: { seatLimit: 10, operatorSeatLimitOverride: true },
    });
  });

  it("does not set override flag for non-stripe orgs", async () => {
    countOrganizationSeatsUsedMock.mockResolvedValue(1);
    await expect(planOperatorWorkspaceSeatPatch("org_1", null, { seatLimit: 5 })).resolves.toEqual({
      plan: { seatLimit: 5 },
    });
  });

  it("rejects seat limits below current usage", async () => {
    countOrganizationSeatsUsedMock.mockResolvedValue(5);
    await expect(planOperatorWorkspaceSeatPatch("org_1", null, { seatLimit: 4 })).resolves.toEqual({
      error: "seat_limit_below_usage",
    });
  });

  it("clears override when requested", async () => {
    await expect(
      planOperatorWorkspaceSeatPatch("org_1", "sub_1", { clearOperatorSeatOverride: true })
    ).resolves.toEqual({
      plan: { operatorSeatLimitOverride: false, clearOperatorSeatOverride: true },
    });
  });
});
