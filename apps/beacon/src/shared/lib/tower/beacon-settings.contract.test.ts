import {
  beaconAppSettingsSchema,
  getDefaultBeaconAppSettings,
  parseBeaconAppSettings,
  parseBeaconAppSettingsPartial,
  serializePresetTargetKey,
} from "@codalyn/webflow-kit";
import { describe, expect, it } from "vitest";

/**
 * Contract: Tower `GET/PUT /api/v1/beacon/settings` body uses `settings` matching BeaconAppSettings.
 * If Tower changes shape, these tests fail before Beacon ships a broken client.
 */
describe("Tower ↔ Beacon settings JSON contract", () => {
  it("parses a minimal GET response envelope", () => {
    const defaults = getDefaultBeaconAppSettings();
    const envelope = {
      settings: defaults,
      editorExperience: false,
      canManageTeamBeaconSettings: false,
      restrictToEditorExperience: false,
      workspaceMemberRole: "designer" as const,
      appUserRole: "user",
      hasActiveWorkspace: true,
      workspaces: [{ id: "org_1", name: "Acme" }],
      activeOrganizationId: "org_1",
      activeOrganizationName: "Acme",
    };
    const parsed = parseBeaconAppSettings((envelope as { settings: unknown }).settings);
    expect(parsed.version).toBe(1);
    expect(parsed.theme).toBe(defaults.theme);
    expect(parsed.cmsLayout.fieldSlug).toBe("");
    expect(envelope.editorExperience).toBe(false);
    expect(envelope.canManageTeamBeaconSettings).toBe(false);
    expect(envelope.restrictToEditorExperience).toBe(false);
    expect(envelope.workspaceMemberRole).toBe("designer");
    expect(envelope.appUserRole).toBe("user");
    expect(envelope.hasActiveWorkspace).toBe(true);
    expect(envelope.workspaces).toEqual([{ id: "org_1", name: "Acme" }]);
    expect(envelope.activeOrganizationId).toBe("org_1");
    expect(envelope.activeOrganizationName).toBe("Acme");
  });

  it("accepts PUT-style partial patches used by mergeBeaconAppSettings on Tower", () => {
    const patch = { theme: "dark" as const, defaultExportQuality: 0.5, cmsLayout: { fieldSlug: "layout-json" } };
    const merged = parseBeaconAppSettingsPartial(patch);
    expect(merged.theme).toBe("dark");
    expect(merged.defaultExportQuality).toBe(0.5);
    expect(merged.cmsLayout?.fieldSlug).toBe("layout-json");
  });

  it("parses and preserves preset storage from Tower payloads", () => {
    const key = serializePresetTargetKey({
      kind: "bare-image-instance",
      siteId: "site_1",
      pageId: "page_1",
      elementId: "img_1",
    });
    const payload = {
      ...getDefaultBeaconAppSettings(),
      imagePresetStorage: {
        siteDefault: {
          id: "site_default",
          name: "Site default",
          width: 1400,
          height: 900,
          maxFileSizeBytes: 100_000,
          targetKey: {
            kind: "site-default" as const,
            siteId: "site_1",
          },
        },
        byTargetKey: {
          [key]: {
            id: "inst_1",
            name: "Instance",
            width: 1000,
            height: 1000,
            maxFileSizeBytes: 90_000,
            targetKey: {
              kind: "bare-image-instance" as const,
              siteId: "site_1",
              pageId: "page_1",
              elementId: "img_1",
            },
          },
        },
      },
    };
    expect(parseBeaconAppSettings(payload).imagePresetStorage).toEqual(payload.imagePresetStorage);
  });

  it("does not accept invalid preset rows in the schema (parse falls back to defaults)", () => {
    const bad = {
      ...getDefaultBeaconAppSettings(),
      imagePresetStorage: {
        siteDefault: {
          id: "",
          name: "x",
          width: 0,
          height: 100,
          maxFileSizeBytes: 5000,
          targetKey: { kind: "site-default" as const, siteId: "site_1" },
        },
        byTargetKey: {},
      },
    };
    expect(beaconAppSettingsSchema.safeParse(bad).success).toBe(false);
    expect(parseBeaconAppSettings(bad)).toEqual(getDefaultBeaconAppSettings());
  });
});
