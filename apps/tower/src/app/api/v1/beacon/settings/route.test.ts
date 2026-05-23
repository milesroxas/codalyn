import { BEACON_IMAGE_ERROR_CODES } from "@codalyn/webflow-kit";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyTowerApiRequest = vi.fn();
const resolveBeaconMembershipContext = vi.fn();
const listBeaconWorkspacesForUser = vi.fn();
const canManageBeaconTeamSettings = vi.fn();
const computeBeaconEditorExperience = vi.fn();
const resolveTargetOrganizationIdForTeamSettings = vi.fn();
const upsertUserBeaconPayload = vi.fn();
const persistTeamBeaconPatch = vi.fn();
const isProductAdminAppRole = vi.fn();
const isTowerTeamAdminRole = vi.fn();

vi.mock("@/server/tower-api-auth", () => ({
  verifyTowerApiRequest,
}));

vi.mock("@/server/beacon-settings-context", () => ({
  resolveBeaconMembershipContext,
  listBeaconWorkspacesForUser,
  canManageBeaconTeamSettings,
  computeBeaconEditorExperience,
  resolveTargetOrganizationIdForTeamSettings,
}));

vi.mock("@/server/beacon-settings-persist", () => ({
  upsertUserBeaconPayload,
  persistTeamBeaconPatch,
}));

vi.mock("@/shared/lib/membership/product-admin-role", () => ({
  isProductAdminAppRole,
}));

vi.mock("@/shared/lib/membership/tower-organization-access", () => ({
  isTowerTeamAdminRole,
}));

vi.mock("@/shared/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => []),
        })),
      })),
    })),
  },
}));

describe("PUT /api/v1/beacon/settings", () => {
  beforeEach(() => {
    verifyTowerApiRequest.mockReset();
    resolveBeaconMembershipContext.mockReset();
    listBeaconWorkspacesForUser.mockReset();
    canManageBeaconTeamSettings.mockReset();
    computeBeaconEditorExperience.mockReset();
    resolveTargetOrganizationIdForTeamSettings.mockReset();
    upsertUserBeaconPayload.mockReset();
    persistTeamBeaconPatch.mockReset();
    isProductAdminAppRole.mockReset();
    isTowerTeamAdminRole.mockReset();

    verifyTowerApiRequest.mockResolvedValue({ ok: true, userId: "user_1" });
    resolveBeaconMembershipContext.mockResolvedValue({
      userId: "user_1",
      appUserRole: "user",
      activeOrganizationId: "org_1",
      memberRole: "designer",
      beaconRestrictToEditorExperience: false,
      beaconTeamSettings: null,
    });
    listBeaconWorkspacesForUser.mockResolvedValue([{ id: "org_1", name: "Acme" }]);
    canManageBeaconTeamSettings.mockReturnValue(true);
    computeBeaconEditorExperience.mockReturnValue(false);
    resolveTargetOrganizationIdForTeamSettings.mockResolvedValue("org_1");
    isProductAdminAppRole.mockReturnValue(false);
    isTowerTeamAdminRole.mockReturnValue(false);
  });

  it("returns PRESET_TARGET_KEY_INVALID for invalid target keys", async () => {
    const { PUT } = await import("./route");
    const res = await PUT(
      new Request("http://localhost/api/v1/beacon/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePresetStorage: {
            siteDefault: null,
            byTargetKey: {
              bad: {
                id: "bad_1",
                name: "Bad",
                width: 1000,
                height: 1000,
                maxFileSizeBytes: 100_000,
                targetKey: {
                  kind: "bare-image-instance",
                  pageId: "page_1",
                  elementId: "img_1",
                },
              },
            },
          },
        }),
      })
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      errorCode: BEACON_IMAGE_ERROR_CODES.PRESET_TARGET_KEY_INVALID,
    });
  });

  it("returns DUPLICATE_PRESET_TARGET for duplicate canonical target keys", async () => {
    const { PUT } = await import("./route");
    const res = await PUT(
      new Request("http://localhost/api/v1/beacon/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePresetStorage: {
            siteDefault: null,
            byTargetKey: {
              one: {
                id: "row_1",
                name: "One",
                width: 1000,
                height: 1000,
                maxFileSizeBytes: 100_000,
                targetKey: { kind: "bare-image-element", siteId: "site_1" },
              },
              two: {
                id: "row_2",
                name: "Two",
                width: 1200,
                height: 900,
                maxFileSizeBytes: 100_000,
                targetKey: { kind: "bare-image-element", siteId: "site_1" },
              },
            },
          },
        }),
      })
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      errorCode: BEACON_IMAGE_ERROR_CODES.DUPLICATE_PRESET_TARGET,
    });
  });

  it("returns TEAM_PRESETS_LOCKED_EDITOR_MODE for editor team preset mutation", async () => {
    computeBeaconEditorExperience.mockReturnValue(true);

    const { PUT } = await import("./route");
    const res = await PUT(
      new Request("http://localhost/api/v1/beacon/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePresetStorage: {
            siteDefault: null,
            byTargetKey: {},
          },
        }),
      })
    );
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({
      errorCode: BEACON_IMAGE_ERROR_CODES.TEAM_PRESETS_LOCKED_EDITOR_MODE,
    });
  });

  it("returns ORGANIZATION_CONTEXT_REQUIRED when team context is missing", async () => {
    resolveTargetOrganizationIdForTeamSettings.mockResolvedValue(null);

    const { PUT } = await import("./route");
    const res = await PUT(
      new Request("http://localhost/api/v1/beacon/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePresetStorage: {
            siteDefault: null,
            byTargetKey: {},
          },
        }),
      })
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      errorCode: BEACON_IMAGE_ERROR_CODES.ORGANIZATION_CONTEXT_REQUIRED,
    });
  });

  it("accepts manager/designer mutation when valid", async () => {
    const { PUT } = await import("./route");
    const res = await PUT(
      new Request("http://localhost/api/v1/beacon/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePresetStorage: {
            siteDefault: null,
            byTargetKey: {},
          },
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(persistTeamBeaconPatch).toHaveBeenCalledTimes(1);
  });

  it("accepts designer mode team preset mutation when permission is granted", async () => {
    resolveBeaconMembershipContext.mockResolvedValue({
      userId: "user_1",
      appUserRole: "user",
      activeOrganizationId: "org_1",
      memberRole: "designer",
      beaconRestrictToEditorExperience: false,
      beaconTeamSettings: null,
    });
    computeBeaconEditorExperience.mockReturnValue(false);
    canManageBeaconTeamSettings.mockReturnValue(true);

    const { PUT } = await import("./route");
    const res = await PUT(
      new Request("http://localhost/api/v1/beacon/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePresetStorage: {
            siteDefault: null,
            byTargetKey: {},
          },
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(persistTeamBeaconPatch).toHaveBeenCalledTimes(1);
  });

  it("accepts manager mode team preset mutation when permission is granted", async () => {
    resolveBeaconMembershipContext.mockResolvedValue({
      userId: "user_1",
      appUserRole: "user",
      activeOrganizationId: "org_1",
      memberRole: "manager",
      beaconRestrictToEditorExperience: false,
      beaconTeamSettings: null,
    });
    computeBeaconEditorExperience.mockReturnValue(false);
    canManageBeaconTeamSettings.mockReturnValue(true);

    const { PUT } = await import("./route");
    const res = await PUT(
      new Request("http://localhost/api/v1/beacon/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePresetStorage: {
            siteDefault: null,
            byTargetKey: {},
          },
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(persistTeamBeaconPatch).toHaveBeenCalledTimes(1);
  });

  it("accepts product admin organization override for team settings", async () => {
    resolveBeaconMembershipContext.mockResolvedValue({
      userId: "user_1",
      appUserRole: "product_admin",
      activeOrganizationId: "org_1",
      memberRole: "designer",
      beaconRestrictToEditorExperience: false,
      beaconTeamSettings: null,
    });
    isProductAdminAppRole.mockReturnValue(true);
    resolveTargetOrganizationIdForTeamSettings.mockResolvedValue("org_2");

    const { PUT } = await import("./route");
    const res = await PUT(
      new Request("http://localhost/api/v1/beacon/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: "org_2",
          imagePresetStorage: {
            siteDefault: null,
            byTargetKey: {},
          },
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(persistTeamBeaconPatch).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        targetOrgId: "org_2",
      })
    );
  });

  it("rejects organization override for non-product-admin", async () => {
    isProductAdminAppRole.mockReturnValue(false);

    const { PUT } = await import("./route");
    const res = await PUT(
      new Request("http://localhost/api/v1/beacon/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: "org_2",
          imagePresetStorage: {
            siteDefault: null,
            byTargetKey: {},
          },
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("accepts site-default target key rows in preset storage", async () => {
    const { PUT } = await import("./route");
    const res = await PUT(
      new Request("http://localhost/api/v1/beacon/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePresetStorage: {
            siteDefault: {
              id: "site_default_1",
              name: "Site default",
              width: 1200,
              height: 800,
              maxFileSizeBytes: 100_000,
              targetKey: {
                kind: "site-default",
                siteId: "site_1",
              },
            },
            byTargetKey: {},
          },
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(persistTeamBeaconPatch).toHaveBeenCalledTimes(1);
  });
});
