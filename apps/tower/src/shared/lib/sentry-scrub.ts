/**
 * Request fields Sentry may attach to a captured error that must never leave Tower: the Tower session
 * bearer every Beacon request carries, cookies, and request bodies (support text, CMS compositions).
 * Applied in `beforeSend` for every runtime, independent of which integrations the SDK version enables
 * by default, so the log boundary does not depend on SDK defaults.
 */
const SENSITIVE_HEADER_NAMES = new Set(["authorization", "proxy-authorization", "cookie", "set-cookie", "x-api-key"]);

type ScrubbableRequest = {
  headers?: Record<string, string>;
  cookies?: unknown;
  data?: unknown;
};

type ScrubbableEvent = {
  request?: ScrubbableRequest;
};

/** Removes credential-bearing headers, cookies and the body from an event's request context. Never throws. */
export function scrubSentryEvent<E extends ScrubbableEvent>(event: E): E {
  const request = event.request;
  if (!request) {
    return event;
  }
  if (request.headers) {
    const kept: Record<string, string> = {};
    for (const [name, value] of Object.entries(request.headers)) {
      if (!SENSITIVE_HEADER_NAMES.has(name.toLowerCase())) {
        kept[name] = value;
      }
    }
    request.headers = kept;
  }
  if ("cookies" in request) {
    delete request.cookies;
  }
  if ("data" in request) {
    delete request.data;
  }
  return event;
}
