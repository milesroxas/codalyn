import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, resolveActiveOrganizationId, dbSelect } = vi.hoisted(() => ({
  getSession: vi.fn(),
  resolveActiveOrganizationId: vi.fn(),
  dbSelect: vi.fn(),
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
vi.mock("@/shared/lib/db", () => ({
  db: {
    select: dbSelect,
  },
}));

import { resolveBeaconMembershipContext } from "@/server/beacon-settings-context";

/** One drizzle select chain whose `.limit()` resolves `rows`. */
function selectChain(rows: unknown[]) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(rows);
  return chain;
}

function beaconRequest(): Request {
  return new Request("https://tower.test/api/v1/beacon/settings", {
    headers: { authorization: "Bearer session-token" },
  });
}

describe("resolveBeaconMembershipContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("never defaults a workspace onto the Designer session: no fallback, and no active workspace reported", async () => {
    // Review round 8 ("Workspace state persisted without explicit user interaction"): a user with
    // memberships but no chosen workspace must come back with none, so the extension shows the
    // suggestion and persists only on the "Use this workspace" click.
    getSession.mockResolvedValue({ user: { id: "user-1" }, session: { id: "sess-1" } });
    dbSelect.mockReturnValueOnce(selectChain([{ role: null }]));
    resolveActiveOrganizationId.mockResolvedValue(null);

    const ctx = await resolveBeaconMembershipContext(beaconRequest());

    expect(resolveActiveOrganizationId).toHaveBeenCalledTimes(1);
    expect(resolveActiveOrganizationId).toHaveBeenCalledWith("user-1", "sess-1", "none");
    expect(ctx).toEqual({
      userId: "user-1",
      appUserRole: null,
      activeOrganizationId: null,
      memberRole: null,
      beaconRestrictToEditorExperience: false,
      beaconTeamSettings: null,
    });
  });

  it("returns null when the request carries no session", async () => {
    getSession.mockResolvedValue(null);

    await expect(resolveBeaconMembershipContext(beaconRequest())).resolves.toBeNull();

    expect(resolveActiveOrganizationId).not.toHaveBeenCalled();
    expect(dbSelect).not.toHaveBeenCalled();
  });
});
