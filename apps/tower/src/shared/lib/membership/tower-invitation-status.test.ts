import { describe, expect, it } from "vitest";
import {
  formatTowerInvitationStatusLabel,
  TOWER_INVITATION_STATUS,
  towerInvitationBadgeVariant,
} from "@/shared/lib/membership/tower-invitation-status";

describe("formatTowerInvitationStatusLabel", () => {
  it("labels account_deleted clearly", () => {
    expect(formatTowerInvitationStatusLabel(TOWER_INVITATION_STATUS.accountDeleted)).toBe("Account deleted");
  });

  it("formats other statuses for display", () => {
    expect(formatTowerInvitationStatusLabel(TOWER_INVITATION_STATUS.pending)).toBe("pending");
  });
});

describe("towerInvitationBadgeVariant", () => {
  it("uses destructive styling for account_deleted", () => {
    expect(towerInvitationBadgeVariant(TOWER_INVITATION_STATUS.accountDeleted)).toBe("destructive");
  });
});
