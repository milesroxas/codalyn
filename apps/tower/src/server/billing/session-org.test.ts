import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, resolveActiveOrganizationId } = vi.hoisted(() => ({
  getSession: vi.fn(),
  resolveActiveOrganizationId: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  auth: {
    api: {
      getSession,
    },
  },
}));
vi.mock("@/server/resolve-active-organization-id", () => ({
  resolveActiveOrganizationId,
}));

import {
  activeOrganizationFallbackForHeaders,
  getActiveOrganizationIdForAuthHeaders,
} from "@/server/billing/session-org";

describe("activeOrganizationFallbackForHeaders", () => {
  it("gives bearer-authenticated (Designer Extension) requests no workspace default", () => {
    expect(activeOrganizationFallbackForHeaders(new Headers({ authorization: "Bearer session-token" }))).toBe("none");
    expect(activeOrganizationFallbackForHeaders(new Headers({ Authorization: "bearer session-token" }))).toBe("none");
  });

  it("keeps the membership default for cookie sessions and for headers without a bearer", () => {
    expect(activeOrganizationFallbackForHeaders(new Headers({ cookie: "better-auth.session_token=abc" }))).toBe(
      "memberships"
    );
    expect(activeOrganizationFallbackForHeaders(new Headers())).toBe("memberships");
    expect(activeOrganizationFallbackForHeaders(new Headers({ authorization: "Basic abc" }))).toBe("memberships");
  });
});

describe("getActiveOrganizationIdForAuthHeaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves a bearer session with no fallback, so an extension session without a workspace stays without one", async () => {
    getSession.mockResolvedValue({ user: { id: "user-ext" }, session: { id: "sess-ext" } });
    resolveActiveOrganizationId.mockResolvedValue(null);

    await expect(
      getActiveOrganizationIdForAuthHeaders(new Headers({ authorization: "Bearer session-token" }))
    ).resolves.toBeNull();

    expect(resolveActiveOrganizationId).toHaveBeenCalledWith("user-ext", "sess-ext", "none");
  });

  it("resolves a cookie session with the membership fallback (Tower web dashboard)", async () => {
    getSession.mockResolvedValue({ user: { id: "user-web" }, session: { id: "sess-web" } });
    resolveActiveOrganizationId.mockResolvedValue("org-1");

    await expect(getActiveOrganizationIdForAuthHeaders(new Headers({ cookie: "s=1" }))).resolves.toBe("org-1");

    expect(resolveActiveOrganizationId).toHaveBeenCalledWith("user-web", "sess-web", "memberships");
  });

  it("returns null without resolving when the headers carry no session", async () => {
    getSession.mockResolvedValue(null);

    await expect(getActiveOrganizationIdForAuthHeaders(new Headers())).resolves.toBeNull();

    expect(resolveActiveOrganizationId).not.toHaveBeenCalled();
  });
});
