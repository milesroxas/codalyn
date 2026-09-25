import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/webflow-oauth-exchange", () => ({ revokeWebflowAccessToken: vi.fn() }));
vi.mock("@/server/webflow-proxy-token", () => ({
  listOrganizationWebflowTokens: vi.fn(),
  deleteOrganizationWebflowOAuthToken: vi.fn(),
}));

import { revokeAndForgetWorkspaceWebflowTokens } from "@/server/membership/revoke-workspace-webflow-tokens";

describe("revokeAndForgetWorkspaceWebflowTokens", () => {
  it("revokes every stored token at Webflow and then forgets it locally, per app", async () => {
    const list = vi.fn().mockResolvedValue([
      { organizationId: "org-1", app: "beacon", accessToken: "tok-beacon" },
      { organizationId: "org-1", app: "flint", accessToken: "tok-flint" },
    ]);
    const revoke = vi.fn().mockResolvedValue(true);
    const forget = vi.fn().mockResolvedValue(undefined);
    const warn = vi.fn();

    const result = await revokeAndForgetWorkspaceWebflowTokens(["org-1"], { list, revoke, forget, warn });

    expect(list).toHaveBeenCalledWith(["org-1"]);
    expect(revoke.mock.calls).toEqual([
      ["tok-beacon", "beacon"],
      ["tok-flint", "flint"],
    ]);
    expect(forget.mock.calls).toEqual([
      ["org-1", "beacon"],
      ["org-1", "flint"],
    ]);
    expect(revoke.mock.invocationCallOrder[0]).toBeLessThan(forget.mock.invocationCallOrder[0]);
    expect(result).toEqual({ revoked: 2, unconfirmed: 0 });
    expect(warn).not.toHaveBeenCalled();
  });

  it("still forgets the token and never throws when Webflow does not confirm the revoke", async () => {
    const list = vi.fn().mockResolvedValue([{ organizationId: "org-1", app: "beacon", accessToken: "tok" }]);
    const revoke = vi.fn().mockRejectedValue(new Error("network"));
    const forget = vi.fn().mockResolvedValue(undefined);
    const warn = vi.fn();

    await expect(revokeAndForgetWorkspaceWebflowTokens(["org-1"], { list, revoke, forget, warn })).resolves.toEqual({
      revoked: 0,
      unconfirmed: 1,
    });
    expect(forget).toHaveBeenCalledWith("org-1", "beacon");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).not.toContain("tok");
  });

  it("does nothing for an empty organization list", async () => {
    const list = vi.fn();
    await expect(revokeAndForgetWorkspaceWebflowTokens([], { list })).resolves.toEqual({ revoked: 0, unconfirmed: 0 });
    expect(list).not.toHaveBeenCalled();
  });
});
