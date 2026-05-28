import { describe, expect, it, vi } from "vitest";
import { fetchTeamInvitationSignUpPrefill } from "@/features/auth/lib/team-invitation-sign-up-prefill";

describe("fetchTeamInvitationSignUpPrefill", () => {
  it("returns email when preview is valid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          organizationName: "Acme",
          email: " invited@example.com ",
          role: "member",
          inviterName: "Alex",
        }),
      })
    );

    const result = await fetchTeamInvitationSignUpPrefill("inv_123");
    expect(result).toEqual({
      ok: true,
      prefill: { email: "invited@example.com", firstName: null, lastName: null },
    });
  });

  it("returns expired message when preview is expired", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: false,
          reason: "expired",
          email: "invited@example.com",
        }),
      })
    );

    const result = await fetchTeamInvitationSignUpPrefill("inv_123");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("new invitation");
    }
  });

  it("returns loading error when preview request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const result = await fetchTeamInvitationSignUpPrefill("inv_123");
    expect(result.ok).toBe(false);
  });
});
