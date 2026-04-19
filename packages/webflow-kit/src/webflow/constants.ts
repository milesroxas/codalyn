/** Webflow Data API (REST) — single source of truth for Tower proxy + clients. */
export const WEBFLOW_DATA_API_BASE = "https://api.webflow.com";

/** Current Data API path prefix used by Tower’s `/api/v1/webflow/*` proxy. */
export const WEBFLOW_DATA_API_VERSION_PATH = "v2" as const;

export function webflowDataApiUrl(pathSegments: string[]): URL {
  const base = `${WEBFLOW_DATA_API_BASE}/${WEBFLOW_DATA_API_VERSION_PATH}`;
  const joined = pathSegments
    .map((s) => s.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
  return new URL(joined ? `${base}/${joined}` : base);
}
