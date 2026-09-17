// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  register: vi.fn(),
  group: vi.fn(),
  capture: vi.fn(),
  captureException: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
}));

vi.mock("posthog-js", () => ({ default: posthogMock }));

import {
  applyTelemetryConsent,
  captureObservabilityEvent,
  captureObservabilityException,
  initObservability,
  isObservabilityActive,
  resetObservabilityForTests,
} from "./init-observability";
import { redactBeaconTelemetryEvent } from "./telemetry-event-redaction";
import { readTelemetryConsent } from "./telemetry-preference";

/** The SDK loads through a dynamic import; wait for the mocked client to be initialized (or settle). */
async function flush(): Promise<void> {
  try {
    await vi.waitFor(() => expect(posthogMock.init).toHaveBeenCalled(), { timeout: 2000, interval: 5 });
  } catch {
    /* no init expected in this scenario */
  }
  await new Promise((resolve) => setTimeout(resolve, 10));
}

/**
 * Wiring evidence for review round 8 (Privacy and Data Protection): the SDK starts only after consent
 * and every event passes through the redaction handler (`before_send`). The redaction itself is
 * pinned in telemetry-event-redaction.test.ts with synthetic sensitive values.
 */
describe("initObservability", () => {
  beforeEach(() => {
    localStorage.clear();
    resetObservabilityForTests();
    for (const fn of Object.values(posthogMock)) {
      fn.mockReset();
    }
    vi.stubGlobal("webflow", {
      getSiteInfo: async () => ({
        siteId: "site-1",
        siteName: "Site",
        shortName: "site",
        workspaceId: "ws-1",
        workspaceSlug: "ws",
      }),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does nothing before consent — no SDK initialization, captures are no-ops", async () => {
    initObservability();
    captureObservabilityException(new Error("x"));
    captureObservabilityEvent("beacon_help_requested", { kind: "help" });
    await flush();
    expect(posthogMock.init).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
    expect(posthogMock.captureException).not.toHaveBeenCalled();
    expect(isObservabilityActive()).toBe(false);
  });

  it("initializes with the redaction before_send handler and privacy floor once consent is granted", async () => {
    applyTelemetryConsent("granted");
    await flush();

    expect(readTelemetryConsent()).toBe("granted");
    expect(posthogMock.init).toHaveBeenCalledTimes(1);
    const options = posthogMock.init.mock.calls[0][1] as Record<string, unknown>;
    expect(options.before_send).toBe(redactBeaconTelemetryEvent);
    expect(options).toMatchObject({
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
    });
    expect(posthogMock.register).toHaveBeenCalledWith(expect.objectContaining({ app: "beacon", $geoip_disable: true }));
    expect(posthogMock.group).toHaveBeenCalledWith("site", "site-1", expect.any(Object));
    expect(isObservabilityActive()).toBe(true);
  });

  it("routes product events and handled exceptions through the initialized client", async () => {
    applyTelemetryConsent("granted");
    await flush();
    captureObservabilityEvent("beacon_help_requested", { kind: "help" });
    const error = new Error("boom");
    captureObservabilityException(error, { componentStack: "x" });
    expect(posthogMock.capture).toHaveBeenCalledWith("beacon_help_requested", { kind: "help" });
    expect(posthogMock.captureException).toHaveBeenCalledWith(error, { componentStack: "x" });
  });

  it("stops capture on a denial and does not re-init on a second grant", async () => {
    applyTelemetryConsent("granted");
    await flush();
    applyTelemetryConsent("denied");
    expect(readTelemetryConsent()).toBe("denied");
    expect(posthogMock.opt_out_capturing).toHaveBeenCalledTimes(1);
    applyTelemetryConsent("granted");
    await flush();
    expect(posthogMock.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: null });
    expect(posthogMock.init).toHaveBeenCalledTimes(1);
  });
});
