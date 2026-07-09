// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { isTelemetryGranted, readTelemetryConsent, setTelemetryConsent } from "@/shared/lib/telemetry-preference";

const CONSENT_KEY = "codalyn:beacon-telemetry-consent";
const LEGACY_OPT_OUT_KEY = "codalyn:beacon-telemetry-opt-out";

describe("telemetry consent preference", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("is unset (null) before any decision — telemetry disabled", () => {
    expect(readTelemetryConsent()).toBeNull();
    expect(isTelemetryGranted()).toBe(false);
  });

  it("round-trips an explicit grant and denial", () => {
    setTelemetryConsent("granted");
    expect(readTelemetryConsent()).toBe("granted");
    expect(isTelemetryGranted()).toBe(true);

    setTelemetryConsent("denied");
    expect(readTelemetryConsent()).toBe("denied");
    expect(isTelemetryGranted()).toBe(false);
  });

  it("honors the legacy opt-out flag as an explicit denial", () => {
    localStorage.setItem(LEGACY_OPT_OUT_KEY, "1");
    expect(readTelemetryConsent()).toBe("denied");
    expect(isTelemetryGranted()).toBe(false);
  });

  it("clears the legacy flag once a consent decision is stored", () => {
    localStorage.setItem(LEGACY_OPT_OUT_KEY, "1");
    setTelemetryConsent("granted");
    expect(localStorage.getItem(LEGACY_OPT_OUT_KEY)).toBeNull();
    expect(readTelemetryConsent()).toBe("granted");
  });

  it("treats malformed stored values as undecided (never as consent)", () => {
    localStorage.setItem(CONSENT_KEY, "yes");
    expect(readTelemetryConsent()).toBeNull();
    expect(isTelemetryGranted()).toBe(false);
  });
});
