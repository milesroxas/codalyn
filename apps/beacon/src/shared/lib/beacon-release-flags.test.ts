import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isBeaconRichTextEditorEnabled,
  isBeaconTelemetryEnabled,
  resolveLocalizedSiteCmsWritePolicy,
} from "./beacon-release-flags";

describe("beacon release flags", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("telemetry follows the build constant (Vitest pins it on so SDK code paths stay testable)", () => {
    expect(isBeaconTelemetryEnabled()).toBe(true);
  });

  it("the rich-text editor follows the build constant (Vitest pins it on so the editor stays testable)", () => {
    expect(isBeaconRichTextEditorEnabled()).toBe(true);
  });

  it("localized-site CMS writes are blocked unless the flag is exactly 'primary'", () => {
    vi.stubEnv("VITE_BEACON_LOCALIZED_SITE_CMS_WRITES", "");
    expect(resolveLocalizedSiteCmsWritePolicy()).toBe("blocked");
    vi.stubEnv("VITE_BEACON_LOCALIZED_SITE_CMS_WRITES", "blocked");
    expect(resolveLocalizedSiteCmsWritePolicy()).toBe("blocked");
    vi.stubEnv("VITE_BEACON_LOCALIZED_SITE_CMS_WRITES", "PRIMARY");
    expect(resolveLocalizedSiteCmsWritePolicy()).toBe("blocked");
    vi.stubEnv("VITE_BEACON_LOCALIZED_SITE_CMS_WRITES", " primary ");
    expect(resolveLocalizedSiteCmsWritePolicy()).toBe("primary");
  });
});
