import { beforeEach, describe, expect, it, vi } from "vitest";

const emailHasPendingOrgInvitation = vi.fn();
const loadTeamInvitationPreview = vi.fn();
const markEmailVerifiedForEmail = vi.fn();

vi.mock("@/server/access/early-access", () => ({
  emailHasPendingOrgInvitation,
}));

vi.mock("@/server/membership/team-invitation-preview", () => ({
  loadTeamInvitationPreview,
}));

vi.mock("@/server/membership/email-verification-trust", () => ({
  markEmailVerifiedForEmail,
  markEmailVerifiedForUserId: vi.fn(),
}));

describe("team invitation email trust", () => {
  beforeEach(() => {
    emailHasPendingOrgInvitation.mockReset();
    loadTeamInvitationPreview.mockReset();
    markEmailVerifiedForEmail.mockReset();
  });

  it("skips verification when a pending invite exists for the email", async () => {
    emailHasPendingOrgInvitation.mockResolvedValue(true);
    const { shouldSkipVerificationEmailForTeamInvite } = await import(
      "@/server/membership/team-invitation-email-trust"
    );

    await expect(
      shouldSkipVerificationEmailForTeamInvite({
        email: "invited@example.com",
        invitationId: null,
      })
    ).resolves.toBe(true);
  });

  it("skips verification when the invitation header matches a pending invite", async () => {
    emailHasPendingOrgInvitation.mockResolvedValue(false);
    loadTeamInvitationPreview.mockResolvedValue({
      ok: true,
      email: "invited@example.com",
      organizationName: "Acme",
      role: "member",
      inviterName: "Alex",
    });
    const { shouldSkipVerificationEmailForTeamInvite } = await import(
      "@/server/membership/team-invitation-email-trust"
    );

    await expect(
      shouldSkipVerificationEmailForTeamInvite({
        email: "invited@example.com",
        invitationId: "inv_123",
      })
    ).resolves.toBe(true);
  });

  it("trusts email ownership for any pending org invitation", async () => {
    emailHasPendingOrgInvitation.mockResolvedValue(true);
    const { trustEmailForPendingOrgInvitationEmail } = await import("@/server/membership/team-invitation-email-trust");

    await expect(trustEmailForPendingOrgInvitationEmail("invited@example.com")).resolves.toBe(true);
    expect(markEmailVerifiedForEmail).toHaveBeenCalledWith("invited@example.com");
  });
});
