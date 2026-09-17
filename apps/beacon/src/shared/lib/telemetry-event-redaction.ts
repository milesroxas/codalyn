/**
 * Application-level redaction for every telemetry event (review round 8, 2026-09-17, Privacy and
 * Data Protection: "Exception telemetry has no application-level redaction … Add a before_send
 * handler that redacts URLs and message payloads").
 *
 * Wired as PostHog's `before_send` in init-observability.ts, so it runs on every event the SDK would
 * transmit — product events, `$exception` events from unhandled errors/rejections, `$set`/`$set_once`
 * person properties — after the SDK has attached its own default properties. It is a pure function
 * over the event object so the exact outgoing shape can be pinned with synthetic sensitive values
 * (telemetry-event-redaction.test.ts).
 *
 * Two layers:
 * 1. **Property denylist** — keys that carry a URL, path, host, referrer, IP or page title at any
 *    depth of `properties` / `$set` / `$set_once` are dropped outright (`$current_url`, `$pathname`,
 *    `$host`, `$referrer`, `$initial_current_url`, `title`, `$ip`, campaign params …). The extension
 *    document URL embeds Webflow's per-upload bundle path and Designer context; none of it is in the
 *    disclosed field list.
 * 2. **String scrubbing** — every remaining string at any depth has URLs, e-mail addresses, bearer
 *    tokens, JWTs, query strings and long opaque tokens replaced with fixed placeholders. Exception
 *    messages keep their sentence structure (still triageable) but no embedded payload; stack frame
 *    file references are reduced to a bare file name (no origin, no upload-id path, no query).
 *
 * Disclosed identifiers (24-hex Webflow site / workspace / item ids, app version, group names) are
 * left intact — they are in the consent copy — and no other property is invented or defaulted.
 */

/**
 * Structural view of PostHog's `CaptureResult` — enough to redact without importing the SDK
 * (the real type is assignable to it; other fields such as `uuid`/`timestamp` are copied untouched).
 */
export type TelemetryEventLike = {
  event: string;
  properties?: Record<string, unknown> | null;
  $set?: Record<string, unknown> | null;
  $set_once?: Record<string, unknown> | null;
};

export const REDACTED_URL = "[url]";
export const REDACTED_EMAIL = "[email]";
export const REDACTED_TOKEN = "[token]";
export const REDACTED_QUERY = "?[query]";

/**
 * Property keys dropped wherever they occur. Matches PostHog's location/navigation defaults
 * (`$current_url`, `$pathname`, `$host`, `$referrer`, `$referring_domain`, their `$initial_*`
 * person-property twins, `$search_engine`, `$ip`, `title`) and campaign/click identifiers.
 */
const DENIED_PROPERTY_KEY = /url|referr|pathname|(^\$?|_)host$|search_engine|^title$|^\$ip$|utm_|gclid|fbclid|msclkid/i;

const URL_RE = /\b(?:https?|wss?|ftp|file):\/\/[^\s"'<>)\]]*/gi;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const JWT_RE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\b/g;
const BEARER_RE = /\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const QUERY_STRING_RE = /\?[^\s"'<>]+/g;
/** Session tokens, API keys, SRI digests, presigned signatures: 40+ opaque characters in one run. */
const OPAQUE_TOKEN_RE = /[A-Za-z0-9_+/=-]{40,}/g;

/** Scrubs a single string value. Exported for the exception-message tests. */
export function scrubTelemetryString(value: string): string {
  return value
    .replace(URL_RE, REDACTED_URL)
    .replace(JWT_RE, REDACTED_TOKEN)
    .replace(BEARER_RE, `bearer ${REDACTED_TOKEN}`)
    .replace(EMAIL_RE, REDACTED_EMAIL)
    .replace(QUERY_STRING_RE, REDACTED_QUERY)
    .replace(OPAQUE_TOKEN_RE, REDACTED_TOKEN);
}

/** `https://cdn.prod.website-files.com/<upload id>/bundle.js?x=1#y` → `bundle.js`. */
export function scrubStackFrameLocation(value: string): string {
  const withoutQuery = value.split(/[?#]/, 1)[0] ?? "";
  const segments = withoutQuery.split("/").filter((segment) => segment.length > 0);
  const last = segments[segments.length - 1];
  return last === undefined || /^https?:$/i.test(last) ? "" : scrubTelemetryString(last);
}

const STACK_FRAME_LOCATION_KEYS = new Set(["filename", "abs_path", "module"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function redactValue(value: unknown, key: string | null): unknown {
  if (typeof value === "string") {
    return key !== null && STACK_FRAME_LOCATION_KEYS.has(key)
      ? scrubStackFrameLocation(value)
      : scrubTelemetryString(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, null));
  }
  if (isRecord(value)) {
    return redactRecord(value);
  }
  return value;
}

function redactRecord(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (DENIED_PROPERTY_KEY.test(key)) {
      continue;
    }
    out[key] = redactValue(value, key);
  }
  return out;
}

/**
 * PostHog `before_send`: returns a redacted copy of the event, or `null` for `null` (the SDK's
 * "drop" signal passes through untouched). Never mutates the input.
 */
export function redactBeaconTelemetryEvent<T extends TelemetryEventLike | null>(event: T): T {
  if (event === null) {
    return event;
  }
  const out: TelemetryEventLike & Record<string, unknown> = { ...event };
  for (const bag of ["properties", "$set", "$set_once"] as const) {
    const value = event[bag];
    if (isRecord(value)) {
      out[bag] = redactRecord(value);
    }
  }
  return out as T;
}
