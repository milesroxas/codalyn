/**
 * Beacon-facing mirror of `POST /api/account/request-early-access` so the Designer extension can
 * submit the early-access form inline. `/api/v1` responses get CORS headers from the middleware
 * for Webflow extension origins; `/api/account/*` responses are not readable cross-origin.
 */
export { POST } from "@/app/api/account/request-early-access/route";
