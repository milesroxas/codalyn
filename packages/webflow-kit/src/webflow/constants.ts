/** Webflow Data API (REST) — single source of truth for Tower proxy + clients. */
export const WEBFLOW_DATA_API_BASE = "https://api.webflow.com";

/** Webflow Data API version segment (`https://api.webflow.com/v2/...`). Tower exposes a proxy at `/api/v2/webflow/*`. */
export const WEBFLOW_DATA_API_VERSION_PATH = "v2" as const;

export function webflowDataApiUrl(pathSegments: string[]): URL {
  const base = `${WEBFLOW_DATA_API_BASE}/${WEBFLOW_DATA_API_VERSION_PATH}`;
  const joined = pathSegments
    .map((s) => s.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
  return new URL(joined ? `${base}/${joined}` : base);
}
