import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/webflow-proxy-token", () => ({
  resolveActiveOrganizationWebflowToken: vi.fn(),
  deleteOrganizationWebflowOAuthToken: vi.fn(),
}));

import {
  deleteOrganizationWebflowOAuthToken,
  resolveActiveOrganizationWebflowToken,
} from "@/server/webflow-proxy-token";
import { listWebflowSitesForUser } from "@/server/webflow-sites";

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("listWebflowSitesForUser", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(resolveActiveOrganizationWebflowToken).mockReset();
    vi.mocked(deleteOrganizationWebflowOAuthToken).mockReset().mockResolvedValue(undefined);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns the sites the stored workspace token can reach", async () => {
    vi.mocked(resolveActiveOrganizationWebflowToken).mockResolvedValue({ organizationId: "org-1", accessToken: "tok" });
    fetchMock.mockResolvedValue(
      jsonResponse(200, { sites: [{ id: "site-1", displayName: "Demo", shortName: "demo" }] })
    );

    const sites = await listWebflowSitesForUser({ userId: "user-1", requestHeaders: new Headers() });

    expect(sites?.map((s) => s.id)).toEqual(["site-1"]);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ headers: { Authorization: "Bearer tok" } });
    expect(deleteOrganizationWebflowOAuthToken).not.toHaveBeenCalled();
  });

  it("deletes a stored token Webflow refuses with 401 and reports no connection (R8.22)", async () => {
    vi.mocked(resolveActiveOrganizationWebflowToken).mockResolvedValue({
      organizationId: "org-1",
      accessToken: "dead",
    });
    fetchMock.mockResolvedValue(jsonResponse(401, { message: "Unauthorized" }));

    const sites = await listWebflowSitesForUser({ userId: "user-1", requestHeaders: new Headers() });

    expect(sites).toBeNull();
    expect(deleteOrganizationWebflowOAuthToken).toHaveBeenCalledWith("org-1");
  });

  it("keeps the token on any other failure (403 is a scope problem, not revocation)", async () => {
    vi.mocked(resolveActiveOrganizationWebflowToken).mockResolvedValue({ organizationId: "org-1", accessToken: "tok" });
    fetchMock.mockResolvedValue(jsonResponse(403, { message: "missing scope" }));

    const sites = await listWebflowSitesForUser({ userId: "user-1", requestHeaders: new Headers() });

    expect(sites).toEqual([]);
    expect(deleteOrganizationWebflowOAuthToken).not.toHaveBeenCalled();
  });

  it("never prunes when the caller passes a token explicitly (fresh from the OAuth callback)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, {}));

    const sites = await listWebflowSitesForUser({
      userId: "user-1",
      requestHeaders: new Headers(),
      accessToken: "fresh",
    });

    expect(sites).toEqual([]);
    expect(resolveActiveOrganizationWebflowToken).not.toHaveBeenCalled();
    expect(deleteOrganizationWebflowOAuthToken).not.toHaveBeenCalled();
  });

  it("returns null when the workspace holds no token", async () => {
    vi.mocked(resolveActiveOrganizationWebflowToken).mockResolvedValue(undefined);
    await expect(listWebflowSitesForUser({ userId: "user-1", requestHeaders: new Headers() })).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
