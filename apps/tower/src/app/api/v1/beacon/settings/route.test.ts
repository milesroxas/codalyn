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

  it("returns PRESET_TARGET_KEY_INVALID for invalid v2 target keys", async () => {
    const { PUT } = await import("./route");
    const res = await PUT(
      new Request("http://localhost/api/v1/beacon/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePresetStorageV2: {
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
          imagePresetStorageV2: {
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
          imagePresetStorageV2: {
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
          imagePresetStorageV2: {
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
          imagePresetStorageV2: {
            siteDefault: null,
            byTargetKey: {},
          },
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(persistTeamBeaconPatch).toHaveBeenCalledTimes(1);
  });
});
