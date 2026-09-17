import { describe, expect, it } from "vitest";
import {
  REDACTED_EMAIL,
  REDACTED_QUERY,
  REDACTED_TOKEN,
  REDACTED_URL,
  redactBeaconTelemetryEvent,
  scrubStackFrameLocation,
  scrubTelemetryString,
  type TelemetryEventLike,
} from "./telemetry-event-redaction";

/**
 * Synthetic sensitive values (review round 8: "verify outgoing events with synthetic sensitive values
 * before resubmitting"). None is a real credential; each stands in for a class of value that must
 * never leave the extension in a telemetry event.
 */
const SYNTHETIC = {
  email: "reviewer@example.test",
  bearer: "bearer sess_0123456789abcdefABCDEF",
  jwt: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.c2lnbmF0dXJlX3N5bnRoZXRpYw",
  presigned:
    "https://s3.amazonaws.com/webflow-prod-assets/abc/runtime.js?X-Amz-Signature=deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  tower: "https://tower.codalyn.app/api/v1/beacon/settings?token=synthetic-one-time-token-value",
  opaque: "c29tZS1sb25nLW9wYXF1ZS1zZXNzaW9uLXRva2VuLXZhbHVlLWhlcmU",
  siteId: "6a35c562c551e2eb11bc4f1c",
};

describe("scrubTelemetryString", () => {
  it("replaces URLs, e-mails, bearer tokens, JWTs, query strings and long opaque tokens with placeholders", () => {
    const input = `Failed for ${SYNTHETIC.email} at ${SYNTHETIC.tower} (${SYNTHETIC.bearer}) jwt=${SYNTHETIC.jwt} key=${SYNTHETIC.opaque} path=/api/x?sig=abc`;
    const out = scrubTelemetryString(input);
    expect(out).not.toContain("example.test");
    expect(out).not.toContain("tower.codalyn.app");
    expect(out).not.toContain("synthetic-one-time-token-value");
    expect(out).not.toContain("sess_0123456789");
    expect(out).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(out).not.toContain(SYNTHETIC.opaque);
    expect(out).not.toContain("sig=abc");
    expect(out).toContain(REDACTED_URL);
    expect(out).toContain(REDACTED_EMAIL);
    expect(out).toContain(`bearer ${REDACTED_TOKEN}`);
    expect(out).toContain(REDACTED_QUERY);
  });

  it("keeps the sentence structure and disclosed 24-hex Webflow identifiers", () => {
    expect(scrubTelemetryString(`Could not update CMS item ${SYNTHETIC.siteId} (403): forbidden`)).toBe(
      `Could not update CMS item ${SYNTHETIC.siteId} (403): forbidden`
    );
    expect(scrubTelemetryString("Create runtime asset: unexpected response.")).toBe(
      "Create runtime asset: unexpected response."
    );
  });

  it("scrubs a presigned S3 URL including its signature", () => {
    const out = scrubTelemetryString(`upload failed: ${SYNTHETIC.presigned}`);
    expect(out).toBe(`upload failed: ${REDACTED_URL}`);
  });
});

describe("scrubStackFrameLocation", () => {
  it("reduces a hosted bundle URL to its bare file name", () => {
    expect(scrubStackFrameLocation("https://cdn.prod.website-files.com/6aa8369abcdef/bundle.js?v=1#L1")).toBe(
      "bundle.js"
    );
    expect(scrubStackFrameLocation("https://cdn.prod.website-files.com/6aa8369abcdef/assets/label-abc123.js")).toBe(
      "label-abc123.js"
    );
    expect(scrubStackFrameLocation("bundle.js")).toBe("bundle.js");
  });

  it("returns an empty location for a bare origin or an empty string", () => {
    expect(scrubStackFrameLocation("https://cdn.prod.website-files.com/")).toBe("cdn.prod.website-files.com");
    expect(scrubStackFrameLocation("https:")).toBe("");
    expect(scrubStackFrameLocation("")).toBe("");
  });
});

type SyntheticEvent = TelemetryEventLike & { uuid?: string; timestamp?: string };

describe("redactBeaconTelemetryEvent (PostHog before_send)", () => {
  function exceptionEvent(): SyntheticEvent {
    return {
      event: "$exception",
      uuid: "0198-synthetic",
      timestamp: "2026-09-17T00:00:00.000Z",
      properties: {
        $current_url: "https://webflow.com/design/site?app=beacon&x=1",
        $pathname: "/design/site",
        $host: "webflow.com",
        $referrer: "https://webflow.com/dashboard",
        $referring_domain: "webflow.com",
        $search_engine: "google",
        title: "Beacon — Site name",
        $ip: "203.0.113.7",
        $lib: "web",
        $lib_version: "1.369.3",
        $browser: "Chrome",
        $os: "Mac OS X",
        $screen_width: 1440,
        app: "beacon",
        app_version: "0.1.0",
        $groups: { site: SYNTHETIC.siteId, workspace: "6a35c562c551e2eb11bc4f1d" },
        $exception_list: [
          {
            type: "Error",
            value: `Could not sync settings for ${SYNTHETIC.email}: ${SYNTHETIC.tower}`,
            mechanism: { handled: false, type: "onerror" },
            stacktrace: {
              type: "raw",
              frames: [
                {
                  platform: "web:javascript",
                  filename: "https://cdn.prod.website-files.com/6aa8369abcdef/bundle.js?v=1",
                  abs_path: "https://cdn.prod.website-files.com/6aa8369abcdef/bundle.js?v=1",
                  function: "towerFetch",
                  lineno: 80,
                  colno: 12,
                  in_app: true,
                },
              ],
            },
          },
        ],
        $exception_message: `${SYNTHETIC.bearer} ${SYNTHETIC.jwt}`,
        nested: { deep: [`${SYNTHETIC.opaque}`, { $initial_current_url: "https://x.test", ok: "fine" }] },
      },
      $set: { $initial_current_url: "https://webflow.com/design/site", $initial_referrer: "x", plan: "free" },
      $set_once: { $initial_pathname: "/design", first_seen: "2026" },
    };
  }

  it("drops every URL/path/host/referrer/IP/title property at any depth", () => {
    const out = redactBeaconTelemetryEvent(exceptionEvent());
    const props = out.properties as Record<string, unknown>;
    for (const key of [
      "$current_url",
      "$pathname",
      "$host",
      "$referrer",
      "$referring_domain",
      "$search_engine",
      "title",
      "$ip",
    ]) {
      expect(props).not.toHaveProperty(key);
    }
    const nested = props.nested as { deep: unknown[] };
    expect(nested.deep[0]).toBe(REDACTED_TOKEN);
    expect(nested.deep[1]).toEqual({ ok: "fine" });
    expect(out.$set).toEqual({ plan: "free" });
    expect(out.$set_once).toEqual({ first_seen: "2026" });
  });

  it("keeps the disclosed properties intact — build metadata, browser basics, group identifiers", () => {
    const out = redactBeaconTelemetryEvent(exceptionEvent());
    const props = out.properties as Record<string, unknown>;
    expect(props).toMatchObject({
      $lib: "web",
      $lib_version: "1.369.3",
      $browser: "Chrome",
      $os: "Mac OS X",
      $screen_width: 1440,
      app: "beacon",
      app_version: "0.1.0",
      $groups: { site: SYNTHETIC.siteId, workspace: "6a35c562c551e2eb11bc4f1d" },
    });
    expect(out.event).toBe("$exception");
    expect(out.uuid).toBe("0198-synthetic");
    expect(out.timestamp).toBe("2026-09-17T00:00:00.000Z");
  });

  it("scrubs exception messages and reduces stack frame locations to a bare file name", () => {
    const out = redactBeaconTelemetryEvent(exceptionEvent());
    const props = out.properties as Record<string, unknown>;
    const list = props.$exception_list as Array<Record<string, unknown>>;
    expect(list[0].value).toBe(`Could not sync settings for ${REDACTED_EMAIL}: ${REDACTED_URL}`);
    expect(list[0].type).toBe("Error");
    expect(list[0].mechanism).toEqual({ handled: false, type: "onerror" });
    const frame = (list[0].stacktrace as { frames: Array<Record<string, unknown>> }).frames[0];
    expect(frame.filename).toBe("bundle.js");
    expect(frame.abs_path).toBe("bundle.js");
    expect(frame.function).toBe("towerFetch");
    expect(frame.lineno).toBe(80);
    expect(props.$exception_message).toBe(`bearer ${REDACTED_TOKEN} ${REDACTED_TOKEN}`);
  });

  it("leaves no synthetic sensitive value anywhere in the serialized outgoing event", () => {
    const serialized = JSON.stringify(redactBeaconTelemetryEvent(exceptionEvent()));
    for (const value of [
      SYNTHETIC.email,
      SYNTHETIC.jwt,
      SYNTHETIC.opaque,
      "sess_0123456789",
      "synthetic-one-time-token-value",
      "webflow.com/design",
      "cdn.prod.website-files.com",
      "203.0.113.7",
      "Beacon — Site name",
    ]) {
      expect(serialized).not.toContain(value);
    }
  });

  it("passes the SDK's drop signal through and never mutates the input", () => {
    expect(redactBeaconTelemetryEvent(null)).toBeNull();
    const input = exceptionEvent();
    const snapshot = JSON.stringify(input);
    redactBeaconTelemetryEvent(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("handles a product event with no property bags", () => {
    expect(redactBeaconTelemetryEvent({ event: "beacon_help_requested" })).toEqual({ event: "beacon_help_requested" });
    expect(redactBeaconTelemetryEvent({ event: "x", properties: null })).toEqual({ event: "x", properties: null });
  });
});
